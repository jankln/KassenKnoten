/**
 * Fail when the standalone build cannot read a receipt.
 *
 * The receipt scanner is the one feature whose runtime files tracing cannot find on its
 * own: Tesseract starts its worker from a file path inside a `worker_threads` thread,
 * picks an engine build by CPU at runtime, and loads its models by a path assembled from
 * options. None of that is an import, so a missing file does not fail `next build` — it
 * fails the first receipt anybody scans on a deployed instance. That shipped (#10).
 *
 * Two checks, run against a copy of the standalone `node_modules` in an empty temporary
 * directory. The copy matters: inside the repository, or in the Dockerfile's build stage,
 * Node would quietly resolve anything missing from the full `node_modules` one directory
 * up, and both checks would pass on exactly the build they exist to reject.
 *
 * 1. Every literal `require` in the worker's graph resolves. This covers the engine builds
 *    for CPUs other than the one running the check.
 * 2. A real recognition of `scripts/fixtures/receipt-smoke.png`, in both languages, with
 *    the options `server/receipts/ocr.ts` uses. This covers what a static walk cannot —
 *    which engine build really loads, and whether the models are where the app looks.
 *
 * Usage: node scripts/verify-standalone.mjs [standalone-dir]
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { builtinModules, createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const standalone = resolve(process.argv[2] ?? ".next/standalone");
const fixture = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/receipt-smoke.png",
);

const root = mkdtempSync(join(tmpdir(), "kk-standalone-"));
const failures = [];

try {
  cpSync(join(standalone, "node_modules"), join(root, "node_modules"), {
    recursive: true,
    dereference: true,
  });
  walkWorkerGraph();
  if (failures.length === 0) {
    await recognise();
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(
    "verify-standalone: the receipt scanner cannot work in this build.\n  " +
      failures.join("\n  ") +
      "\nSee outputFileTracingIncludes in next.config.ts.",
  );
  process.exit(1);
}
console.log("verify-standalone: the receipt scanner reads a receipt in this build.");

/* ------------------------------------------------------------------------- */

function walkWorkerGraph() {
  const builtins = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
  // A literal `require("…")`. Computed requires are out of reach of this walk and of the
  // tracer alike; the recognition below is what covers them.
  const REQUIRE = /\brequire\(\s*["']([^"']+)["']\s*\)/g;

  /**
   * Requires that appear literally but never run on this app's path, each with its
   * reason. Every entry is a place this walk deliberately looks away, so keep it short.
   */
  const NEVER_LOADED = new Map([
    // tesseract.js 7 always loads the full engine build under Node; see next.config.ts.
    // The recognition below fails the day that changes.
    ["tesseract.js-core/tesseract-core-lstm", "not loaded under Node"],
    ["tesseract.js-core/tesseract-core-simd-lstm", "not loaded under Node"],
    ["tesseract.js-core/tesseract-core-relaxedsimd-lstm", "not loaded under Node"],
    // node-fetch wraps this in try/catch and works without it.
    ["encoding", "optional in node-fetch"],
  ]);

  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file) || ![".js", ".cjs", ""].includes(extname(file))) {
      return;
    }
    seen.add(file);
    const requireFrom = createRequire(file);
    for (const [, specifier] of readFileSync(file, "utf8").matchAll(REQUIRE)) {
      if (
        builtins.has(specifier) ||
        builtins.has(specifier.split("/")[0]) ||
        NEVER_LOADED.has(specifier)
      ) {
        continue;
      }
      try {
        visit(requireFrom.resolve(specifier));
      } catch {
        failures.push(
          `missing ${specifier}, required by ${file.slice(root.length + 1)}`,
        );
      }
    }
  };

  const entry = join(root, "node_modules/tesseract.js/src/worker-script/node/index.js");
  if (!existsSync(entry)) {
    failures.push("tesseract.js is not in the build at all");
    return;
  }
  visit(entry);
}

async function recognise() {
  const requireHere = createRequire(join(root, "index.js"));
  let createWorker;
  try {
    ({ createWorker } = requireHere("tesseract.js"));
  } catch (error) {
    failures.push(`tesseract.js does not load: ${error.message}`);
    return;
  }

  for (const code of ["deu", "eng"]) {
    let worker;
    try {
      const { langPath } = requireHere(`@tesseract.js-data/${code}`);
      // Mirrors server/receipts/ocr.ts — the variant directory and the worker options.
      worker = await withTimeout(
        createWorker(code, 1, {
          langPath: join(dirname(langPath), "4.0.0_best_int"),
          gzip: true,
          cacheMethod: "none",
          legacyCore: false,
          legacyLang: false,
          errorHandler: (error) => failures.push(`${code}: worker failed: ${error}`),
        }),
        `${code}: the worker did not start`,
      );
      const { data } = await withTimeout(
        worker.recognize(fixture),
        `${code}: recognition did not finish`,
      );
      if (!data.text.includes("12,34")) {
        failures.push(
          `${code}: read ${JSON.stringify(data.text)} instead of the fixture`,
        );
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      await worker?.terminate().catch(() => {});
    }
  }
}

function withTimeout(promise, message, ms = 60_000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
