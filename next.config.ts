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
  // Only the LSTM cores are named: `legacyCore: false` in `server/receipts/ocr.ts` means
  // the classic engine is never loaded, and leaving it out of the trace keeps roughly
  // twenty megabytes of WebAssembly out of the image.
  outputFileTracingIncludes: {
    "/*": [
      "db/migrations/**/*",
      "node_modules/tesseract.js/**/*",
      "node_modules/tesseract.js-core/*-lstm*",
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
