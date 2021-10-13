import { readFileSync } from "fs";
import { extract } from "tar";
import { dirname, resolve } from "path";
import { spawnSync } from "child_process";
import gunzip from "gunzip-maybe";
import fetch from "node-fetch";

import type { PackageJson } from "type-fest";

const validateConfiguration = (
  packageJson: PackageJson & { binary: { name: string; url: string } }
) => {
  if (!packageJson.version) return "'version' property must be specified";

  if (!packageJson.binary || typeof packageJson.binary !== "object")
    return "'binary' property must be defined and be an object";

  if (!packageJson.binary.name) return "'name' property is necessary";

  if (!packageJson.binary.url) return "'url' property is required";

  return undefined;
};

const ARCH_MAPPING = {
  ia32: "386",
  x64: "amd64",
  arm: "arm",
};

const PLATFORM_MAPPING = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
  freebsd: "freebsd",
};

function getPlatformMetadata() {
  if (!(process.arch in ARCH_MAPPING))
    throw new Error(
      "Installation is not supported for this architecture: " + process.arch
    );

  if (!(process.platform in PLATFORM_MAPPING))
    throw new Error(
      "Installation is not supported for this platform: " + process.platform
    );

  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json")).toString()
  );
  const error = validateConfiguration(packageJson);
  if (error && error.length > 0)
    throw new Error("Invalid package.json: " + error);

  // We have validated the config. It exists in all its glory

  let { name, url } = packageJson.binary;
  let { version } = packageJson;
  if (version[0] === "v") version = version.substr(1); // strip the 'v' if necessary v0.0.1 => 0.0.1

  // Binary name on Windows has .exe suffix
  if (process.platform === "win32") name += ".exe";

  // Interpolate variables in URL, if necessary

  const arch = process.arch as
    | "arm"
    | "arm64"
    | "ia32"
    | "mips"
    | "mipsel"
    | "ppc"
    | "ppc64"
    | "s390"
    | "s390x"
    | "x32"
    | "x64";

  const platform = process.platform as
    | "aix"
    | "darwin"
    | "freebsd"
    | "linux"
    | "openbsd"
    | "sunos"
    | "win32";
  if (arch in ARCH_MAPPING) {
  }
  url = url.replace(/{{arch}}/g, (ARCH_MAPPING as any)[arch]);
  url = url.replace(/{{platform}}/g, (PLATFORM_MAPPING as any)[platform]);
  url = url.replace(/{{version}}/g, version);
  url = url.replace(/{{bin_name}}/g, name);

  return {
    name,
    url,
  };
}

const download = async (url: string, installDirectory: string) => {
  const res = await fetch(url);

  return new Promise((resolve, reject) => {
    if (res?.body)
      res.body
        .pipe(gunzip())
        .pipe(extract({ cwd: installDirectory }))
        .on("end", resolve)
        .on("error", reject);
    else reject("No data");
  });
};

export const run = async () => {
  try {
    const { name, url } = getPlatformMetadata();
    const [, binLocation, ...args] = process.argv;

    const binFolder = dirname(binLocation);
    await download(url, binFolder);

    const options: Parameters<typeof spawnSync>[2] = {
      cwd: process.cwd(),
      stdio: "inherit",
    };
    const result = spawnSync(resolve(binFolder, name), args, options);

    if (result.error) throw result.error;

    process.exit(result?.status ?? 1);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(`${error}`);
    console.error(err.message);
    process.exit(1);
  }
};
