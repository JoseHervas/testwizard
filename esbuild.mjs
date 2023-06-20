/* eslint-disable no-undef */
import * as esbuild from "esbuild";

const buildOptions = {
  entryPoints: ["./src/extension.ts"],
  bundle: true,
  target: "ES2020",
  sourcemap: process.argv.includes("--sourcemap"),
  outfile: "./out/extension.js",
  external: ["vscode", "keytar"],
  format: "cjs",
  platform: "node",
};

const isWatchMode = process.argv.includes("--watch");

if (isWatchMode) {
  buildOptions.watch = {
    onRebuild(error, result) {
      if (error) {
        console.error("Error during rebuild:", error);
      } else {
        console.log("✅ Rebuild completed!");
      }
    },
  };
}

await esbuild.build(buildOptions);

console.log("Plugin successfully built and bundled 🎉!");
console.log("Listening for file changes...");
