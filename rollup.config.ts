import pkg from "./package.json";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import { defineConfig } from "rollup";

const bundle = (config) => ({
  ...config,
  input: "lib/index.ts",
  external: (id) => !/^[./]/.test(id),
});

export default defineConfig([
  bundle({
    plugins: [esbuild()],
    output: [
      {
        file: pkg.main,
        format: "cjs",
        sourcemap: true,
      },
      {
        file: pkg.module,
        format: "es",
        sourcemap: true,
      },
    ],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: pkg.typings,
      format: "es",
    },
  }),
]);
