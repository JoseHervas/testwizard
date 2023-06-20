import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["./src/extension.ts"],
  bundle: true,
  target: "ES2020",
  outfile: "./out/extension.js",
  external: ["vscode", "keytar"],
  format: "cjs",
  platform: "node",
});

console.log("Plugin successfully built and bundled 🎉!");
