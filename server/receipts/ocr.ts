import path from "node:path";
import { createWorker, type Worker } from "tesseract.js";
import deuData from "@tesseract.js-data/deu";
import engData from "@tesseract.js-data/eng";
import type { Locale } from "@/lib/i18n";

/**
 * Text recognition, on this machine and nowhere else.
 *
 * The obvious way to read a receipt in 2026 is to post the photograph to a hosted model.
 * This application does not do that, and the reason is the whole product: the README
 * promises that a household's figures never leave its own server, and a photographed
 * receipt is the most detailed record of somebody's day this app would ever hold — the
 * shop, the hour, the basket. Tesseract is less accurate than a hosted model on
 * crumpled thermal paper. That trade is made deliberately and in the household's favour.
 *
 * Everything here is I/O around a pure parser. This module produces text;
 * `lib/domain/receipt.ts` decides what the text means, and that is where the tests live.
 */

/**
 * The integerised `tessdata_best` models, not the standard set.
 *
 * Measured against both a clean scan and a deliberately degraded one, the two read the
 * receipt identically — for a fifth of the size. That is 1,3 MB instead of 6,8 MB per
 * language inside the image, on a project whose selling point is that installing it is
 * a `docker compose up`.
 */
const VARIANT = "4.0.0_best_int";

/**
 * Which model reads which household's receipts.
 *
 * The language matters less than it looks: digits and dates are the same everywhere, and
 * the parser's keywords are bilingual regardless. What the model buys is the words around
 * them — `SUMME` with an umlaut two lines up, a shop name that stays a shop name.
 */
const MODELS: Record<Locale, { code: string; shippedPath: string }> = {
  de: { code: "deu", shippedPath: deuData.langPath },
  en: { code: "eng", shippedPath: engData.langPath },
};

/**
 * How long an idle worker is kept alive.
 *
 * Tesseract holds its language model in memory — tens of megabytes — and this app runs
 * on home servers next to a dozen other containers. Two minutes covers a household
 * working through the receipts in a wallet one after another, which is how this feature
 * is actually used, and gives the memory back when they are done.
 */
const IDLE_MS = 120_000;

/** Nothing larger is a photograph of a receipt; it is a mistake or an attack. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * How long one recognition may take before it is given up on.
 *
 * A downscaled receipt is read in a second or two, so this is not a performance budget —
 * it is the guarantee that a wedged worker ends as a sentence on screen rather than as a
 * spinner somebody eventually navigates away from.
 */
const TIMEOUT_MS = 45_000;

/**
 * Where the trained model sits on disk.
 *
 * Taken from the data package's own `langPath`, which it builds from its real
 * `__dirname` at load time — and that is the whole point. Resolving this module's own
 * `import.meta.url` looked equivalent and is not: this file is bundled, so in
 * development the bundler hands back its virtual `[project]/…` path and every read fails
 * with `ENOENT` on the first receipt anybody scans. The data packages are listed in
 * `serverExternalPackages`, so they are loaded by Node and their paths are real ones.
 *
 * Only the directory is borrowed. The package points at its standard `4.0.0` model; this
 * app wants the smaller integerised one beside it.
 */
function langPathFor(model: { shippedPath: string }): string {
  return path.join(path.dirname(model.shippedPath), VARIANT);
}

let current: { model: string; worker: Worker } | null = null;
let idleTimer: NodeJS.Timeout | null = null;

/**
 * Recognitions run one at a time, queued behind each other.
 *
 * Tesseract saturates a core for a second or two. Two people submitting receipts at once
 * on a Raspberry Pi must mean one waits, not that the whole instance stops answering —
 * this is the same reasoning that keeps the login rate limiter in-process.
 */
let queue: Promise<unknown> = Promise.resolve();

function keepAlive(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  idleTimer = setTimeout(() => {
    void release();
  }, IDLE_MS);
  // A pending timer must not be the reason a container refuses to shut down.
  idleTimer.unref?.();
}

async function workerFor(model: {
  code: string;
  shippedPath: string;
}): Promise<Worker> {
  if (current?.model === model.code) {
    return current.worker;
  }
  await release();
  const worker = await createWorker(model.code, 1, {
    langPath: langPathFor(model),
    gzip: true,
    // The models are on disk already. Caching them again would write into the working
    // directory of a container that has no reason to be writable.
    cacheMethod: "none",
    // OEM 1 above is the LSTM engine; this keeps the legacy core out of the bundle too.
    legacyCore: false,
    legacyLang: false,
    // Without this, a failure inside the worker — a model file that is not where it was
    // expected, say — surfaces as an `uncaughtException` on the server rather than as a
    // rejected promise here. A household's whole instance must not fall over because one
    // photograph could not be read.
    errorHandler: (error: unknown) => {
      console.error("[receipt] recognition worker failed:", error);
      void release();
    },
  });
  current = { model: model.code, worker };
  return worker;
}

/** Give the language model's memory back. Safe to call when nothing is running. */
export async function release(): Promise<void> {
  const running = current;
  current = null;
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (running) {
    await running.worker.terminate();
  }
}

/**
 * Read an image into text.
 *
 * Throws only when recognition itself fails. An unreadable photograph is not an error —
 * it is text the parser will find nothing in, and the interface says so in words.
 */
export async function recogniseReceipt(
  image: Buffer,
  locale: Locale,
): Promise<{ text: string; confidence: number }> {
  const model = MODELS[locale] ?? MODELS.en;

  const run = queue.then(async () => {
    const worker = await workerFor(model);

    let expiry: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      expiry = setTimeout(() => {
        // The worker is not coming back; drop it so the next receipt starts clean.
        void release();
        reject(new Error("Recognition timed out"));
      }, TIMEOUT_MS);
      expiry.unref?.();
    });

    try {
      const { data } = await Promise.race([worker.recognize(image), timeout]);
      keepAlive();
      return { text: data.text, confidence: data.confidence };
    } finally {
      clearTimeout(expiry);
    }
  });

  // The queue must survive a failed job, or one bad image blocks every later one.
  queue = run.catch(() => undefined);
  return run;
}
