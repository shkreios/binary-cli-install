import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import gunzip from "gunzip-maybe";

import { dirname, resolve } from "path";
import { extract } from "tar";
import type { PackageJson as PackageJsonDefault } from "type-fest";
import { fetch } from "./utils/fetch";

type ARCHType =
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

type PlatformType =
  | "aix"
  | "darwin"
  | "freebsd"
  | "linux"
  | "openbsd"
  | "sunos"
  | "win32";

export type PackageJson = PackageJsonDefault & {
  binary: { name: string; url: string };
};

export type ArchMapperType = Partial<Record<ARCHType, string>>;
export type PlatformMapperType = Partial<Record<PlatformType, string>>;

export const GO_ARCH_MAPPING: ArchMapperType = {
  ia32: "386",
  x64: "amd64",
  arm: "arm",
};

export const GO_PLATFORM_MAPPING: PlatformMapperType = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
  freebsd: "freebsd",
};

export class Binary {
  constructor(
    private readonly packageJson: PackageJson,
    private readonly ARCH_MAPPING: ArchMapperType,
    private readonly PLATFORM_MAPPING: PlatformMapperType,
    private readonly DEBUG: boolean
  ) {}

  debug = (...args: Parameters<typeof console.log>) =>
    this.DEBUG && console.log(...args);

  getPlatformMetadata() {
    if (!(process.arch in this.ARCH_MAPPING))
      throw new Error(
        "Installation is not supported for this architecture: " + process.arch
      );

    if (!(process.platform in this.PLATFORM_MAPPING))
      throw new Error(
        "Installation is not supported for this platform: " + process.platform
      );

    // Validate packagejson
    if (!this.packageJson.version) throw "'version' property must be specified";
    if (!this.packageJson.binary || typeof this.packageJson.binary !== "object")
      throw "'binary' property must be defined and be an object";
    if (!this.packageJson.binary.name) throw "'name' property is necessary";
    if (!this.packageJson.binary.url) throw "'url' property is required";

    let { name, url } = this.packageJson.binary;
    let { version } = this.packageJson;
    if (version[0] === "v") version = version.substr(1); // strip the 'v' if necessary v0.0.1 => 0.0.1

    // Binary name on Windows has .exe suffix
    if (process.platform === "win32") name += ".exe";

    // Interpolate variables in URL, if necessary

    const arch = process.arch as ARCHType;

    const platform = process.platform as PlatformType;

    url = url.replace(/{{arch}}/g, (this.ARCH_MAPPING as any)[arch]);
    url = url.replace(
      /{{platform}}/g,
      (this.PLATFORM_MAPPING as any)[platform]
    );
    url = url.replace(/{{version}}/g, version);
    url = url.replace(/{{bin_name}}/g, name);

    return {
      name,
      url,
    };
  }

  private async download(name: string, url: string, installDirectory: string) {
    this.debug(
      `Downloading binary ${name} from ${url} into ${installDirectory}.`
    );
    const res = await fetch(url);

    this.debug("Download complete.");
    this.debug("Unpacking archive");
    const result = await new Promise((resolve, reject) => {
      if (res?.body)
        res.body
          .pipe(gunzip())
          .pipe(extract({ cwd: installDirectory }, [name]))
          .on("end", resolve)
          .on("error", reject);
      else reject("Download was empty");
    });
    this.debug("Archive unpacked");
    return result;
  }

  public async run() {
    try {
      const { name, url } = this.getPlatformMetadata();
      const [, binLocation, ...args] = process.argv;

      const binFolder = dirname(binLocation);
      await this.download(name, url, binFolder);

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
  }
}
