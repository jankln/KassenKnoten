import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
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

type Language = "deu" | "eng";

const SHIPPED: Record<Language, string> = {
  deu: deuData.langPath,
  eng: engData.langPath,
};

/**
 * Both models read every receipt, the household's language first.
 *
 * One model used to be enough on the reasoning that digits are the same in every
 * language. Measured, they are not read the same: on a photographed German receipt the
 * English model took the `2` of a large bold total for a `3` — and because it read the
 * `Summe` beside it correctly, the draft presented the wrong figure as read, not as a
 * guess (#12). The two together read it right in either order. The price is about 35 MB
 * while a worker is alive and half a second on a large photo.
 */
const LANGUAGES: Record<Locale, readonly [Language, Language]> = {
  de: ["deu", "eng"],
  en: ["eng", "deu"],
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
function shippedModel(language: Language): string {
  return path.join(
    path.dirname(SHIPPED[language]),
    VARIANT,
    `${language}.traineddata.gz`,
  );
}

/**
 * Put both models into one directory, and return it — or `null` when that is not
 * possible here.
 *
 * tesseract.js reads every language from a single `langPath`, and the two models ship in
 * two packages. Passing the model data in directly is the documented alternative and is
 * broken in tesseract.js 7 (it hands the bytes to the engine as the language's name), so
 * the files are copied, 1,3 MB each.
 *
 * Into a fresh `mkdtemp` directory, never a fixed name: on a shared machine a predictable
 * path in the temporary directory is one somebody else can fill with their own model
 * first. The caller removes it as soon as the worker has started — Tesseract holds the
 * models in memory from then on — so nothing is left behind by a process that is
 * stopped with a signal, which never runs an exit handler. A container whose temporary
 * directory is not writable still scans, in one language, as before.
 */
export function prepareModelDirectory(parent: string = os.tmpdir()): string | null {
  let directory: string | undefined;
  try {
    directory = mkdtempSync(path.join(parent, "kassenknoten-tessdata-"));
    for (const language of ["deu", "eng"] as const) {
      copyFileSync(
        shippedModel(language),
        path.join(directory, `${language}.traineddata.gz`),
      );
    }
    return directory;
  } catch (error) {
    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
    console.warn(
      "[receipt] could not prepare both language models; reading in one language:",
      error,
    );
    return null;
  }
}

let current: { locale: Locale; worker: Worker } | null = null;
let idleTimer: NodeJS.Timeout | null = null;

/**
 * Bumped by every `release()`. A worker whose start began in an earlier generation was
 * given up on while it was starting, and is terminated when it arrives instead of being
 * adopted — otherwise a start that took ninety seconds would quietly become the worker
 * for a later scan, or leak a second copy of the language model.
 */
let generation = 0;

/**
 * Removes the models copied for a start that has not finished. Called by `release()` as
 * well, because a start that never settles — the case #11 is about — would otherwise
 * keep its copy in the temporary directory for the life of the process.
 */
let removePendingModels: (() => void) | null = null;

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

async function workerFor(locale: Locale): Promise<Worker> {
  if (current?.locale === locale) {
    return current.worker;
  }
  await release();
  const startedIn = generation;

  const [first, second] = LANGUAGES[locale] ?? LANGUAGES.en;
  const directory = prepareModelDirectory();
  const model = directory
    ? { langs: `${first}+${second}`, langPath: directory }
    : { langs: first, langPath: path.dirname(shippedModel(first)) };
  const removeModels = () => {
    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
    if (removePendingModels === removeModels) {
      removePendingModels = null;
    }
  };
  removePendingModels = removeModels;

  // Rejected by the worker's error handler. A worker that fails while starting — a
  // module missing from the build, a model file that is not there — reports it there,
  // and the promise from `createWorker` then never settles. Without this, the scan waits
  // for it forever and every later scan queues behind it (#11).
  let failStart: (error: unknown) => void = () => {};
  const startFailed = new Promise<never>((_, reject) => {
    failStart = reject;
  });
  // An error after a successful start rejects nobody; it must not become an unhandled
  // rejection either.
  startFailed.catch(() => undefined);

  const starting = createWorker(model.langs, 1, {
    langPath: model.langPath,
    gzip: true,
    // The models are on disk already. Caching them again would write into the working
    // directory of a container that has no reason to be writable.
    cacheMethod: "none",
    // OEM 1 above is the LSTM engine. These two ask for the LSTM-only core as well, but
    // tesseract.js 7 ignores that under Node and loads the full build anyway — see the
    // tracing notes in next.config.ts, which is where that actually matters.
    legacyCore: false,
    legacyLang: false,
    // Without this, a failure inside the worker — a model file that is not where it was
    // expected, say — surfaces as an `uncaughtException` on the server rather than as a
    // rejected promise here. A household's whole instance must not fall over because one
    // photograph could not be read.
    errorHandler: (error: unknown) => {
      console.error("[receipt] recognition worker failed:", error);
      failStart(error);
      void release();
    },
  });

  // Whenever the start finishes, a worker nobody is waiting for any more is stopped, and
  // the copied models go either way.
  void starting
    .then(
      (worker) => {
        if (generation !== startedIn) {
          void worker.terminate().catch(() => undefined);
        }
      },
      () => undefined,
    )
    .finally(removeModels);

  let worker: Worker;
  try {
    worker = await Promise.race([starting, startFailed]);
  } finally {
    removeModels();
  }
  if (generation !== startedIn) {
    throw new Error("Recognition worker was released while starting");
  }

  // Sauvola instead of Tesseract's default global Otsu threshold. A receipt is
  // photographed, not scanned: there is a shadow from the phone, and the paper gets
  // darker towards one edge. One threshold for the whole image cannot separate ink from
  // paper in both halves, and measured on such a photo it lost the SUMME line entirely,
  // leaving the parser to guess from item prices (#12). Sauvola decides per
  // neighbourhood; evenly lit receipts read exactly as before, in the same time.
  await worker.setParameters({ thresholding_method: "2" });

  current = { locale, worker };
  return worker;
}

/** Give the language model's memory back. Safe to call when nothing is running. */
export async function release(): Promise<void> {
  generation += 1;
  removePendingModels?.();
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
  const run = queue.then(async () => {
    // One deadline for starting the worker and reading the image together. Starting is
    // where a broken build fails, so a deadline that only covered the reading would not
    // cover the failure most worth bounding.
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
      const { data } = await Promise.race([
        workerFor(locale).then((worker) => worker.recognize(image)),
        timeout,
      ]);
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
