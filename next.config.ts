import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server bundle for the Docker image (F17). Only enabled
  // during the image build, because `next start` cannot serve a standalone output.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Packages that must stay outside the bundle and be required at runtime: a native
  // module, and an OCR engine that loads its WebAssembly core and its worker by path.
  serverExternalPackages: [
    "better-sqlite3",
    "tesseract.js",
    "@tesseract.js-data/deu",
    "@tesseract.js-data/eng",
  ],
  // Files opened by a path assembled at runtime. Nothing imports them, so file tracing
  // cannot see them, and the image would start happily and then fail on first use — for
  // the migrations that is the first database access, which is the worst possible time
  // to find out; for the language models it is the first receipt somebody scans.
  //
  // Which engine build is named here is not what the options suggest. tesseract.js 7
  // hands its Node core loader a boolean where the loader expects an OEM value, so under
  // Node it always takes the full build — whatever `legacyCore: false` in
  // `server/receipts/ocr.ts` says. Tracing the `-lstm` builds, as this file once did,
  // shipped an image whose scanner could not start (#10). All three full builds are
  // needed because the loader picks by CPU (relaxed SIMD, SIMD, neither); Node reads the
  // `.js` and the `.wasm` of each.
  // `scripts/verify-standalone.mjs` runs a real recognition in the build, so the day
  // upstream fixes this, the image build says so instead of a household finding out.
  outputFileTracingIncludes: {
    "/*": [
      "db/migrations/**/*",
      "node_modules/tesseract.js/**/*",
      "node_modules/tesseract.js-core/tesseract-core.js",
      "node_modules/tesseract.js-core/tesseract-core.wasm",
      "node_modules/tesseract.js-core/tesseract-core-simd.js",
      "node_modules/tesseract.js-core/tesseract-core-simd.wasm",
      "node_modules/tesseract.js-core/tesseract-core-relaxedsimd.js",
      "node_modules/tesseract.js-core/tesseract-core-relaxedsimd.wasm",
      // What the recognition worker itself requires. It is started from a file path in a
      // worker thread, which tracing cannot follow, so these are never found on their
      // own — and without them every scan on a deployed instance fails (#10).
      // scripts/verify-standalone.mjs checks this list against the worker's imports.
      "node_modules/bmp-js/package.json",
      "node_modules/bmp-js/index.js",
      "node_modules/bmp-js/lib/**/*",
      "node_modules/wasm-feature-detect/package.json",
      "node_modules/wasm-feature-detect/dist/**/*",
      "node_modules/@tesseract.js-data/deu/package.json",
      "node_modules/@tesseract.js-data/deu/4.0.0_best_int/**/*",
      "node_modules/@tesseract.js-data/eng/package.json",
      "node_modules/@tesseract.js-data/eng/4.0.0_best_int/**/*",
    ],
  },
  // The data packages point at their standard models, so tracing them drags in seventeen
  // megabytes this app never opens — `server/receipts/ocr.ts` borrows the directory and
  // reads the integerised model beside it. The `4.0.0/` in the pattern is the directory,
  // not a prefix: `4.0.0_best_int/` stays.
  outputFileTracingExcludes: {
    "/*": ["node_modules/@tesseract.js-data/*/4.0.0/**/*"],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
