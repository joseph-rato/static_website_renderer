import * as esbuild from "esbuild";
import { readFileSync } from "fs";

const start = performance.now();

await esbuild.build({
  entryPoints: ["src/handler.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: "bundle/handler.mjs",
  format: "esm",
  minify: true,
  sourcemap: true,
  treeShaking: true,
  // Mark aws-sdk as external (provided by Lambda runtime)
  external: ["@aws-sdk/*"],
  banner: {
    // createRequire shim for any CJS dependencies
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

const elapsed = (performance.now() - start).toFixed(0);
const stats = readFileSync("bundle/handler.mjs");
const sizeKB = (stats.byteLength / 1024).toFixed(1);

console.log(`✓ Bundled to bundle/handler.mjs (${sizeKB} KB) in ${elapsed}ms`);
