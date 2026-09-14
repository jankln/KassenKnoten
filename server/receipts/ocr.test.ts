import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The worker lifecycle around Tesseract, with Tesseract itself mocked out.
 *
 * What is under test is not recognition — that is Tesseract's job — but what a household
 * sees when the engine misbehaves: an answer within the time budget, and a next scan that
 * is not stuck behind the last one (#11).
 */

type Options = { errorHandler?: (error: unknown) => void };
type FakeWorker = {
  recognize: ReturnType<typeof vi.fn>;
  setParameters: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
};

const createWorker =
  vi.fn<(code: string, oem: number, options: Options) => Promise<FakeWorker>>();
vi.mock("tesseract.js", () => ({ createWorker }));

function workingWorker(text = "SUMME 12,34"): FakeWorker {
  return {
    recognize: vi.fn(async () => ({ data: { text, confidence: 90 } })),
    setParameters: vi.fn(async () => ({})),
    terminate: vi.fn(async () => {}),
  };
}

const image = Buffer.from("not really an image");

describe("recogniseReceipt", () => {
  beforeEach(() => {
    vi.resetModules();
    createWorker.mockReset();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    const { release } = await import("./ocr");
    await release();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reads a receipt with a worker that starts", async () => {
    const worker = workingWorker();
    createWorker.mockResolvedValue(worker);
    const { recogniseReceipt } = await import("./ocr");

    await expect(recogniseReceipt(image, "de")).resolves.toEqual({
      text: "SUMME 12,34",
      confidence: 90,
    });
    // Sauvola, set before the first image is read (#12).
    expect(worker.setParameters).toHaveBeenCalledWith({ thresholding_method: "2" });
    expect(worker.setParameters.mock.invocationCallOrder[0]).toBeLessThan(
      worker.recognize.mock.invocationCallOrder[0]!,
    );
  });

  it("starts with both models, the household's language first, and removes the copies", async () => {
    createWorker.mockImplementation(async () => workingWorker());
    const { recogniseReceipt } = await import("./ocr");

    await recogniseReceipt(image, "en");

    const [langs, , options] = createWorker.mock.calls[0]!;
    expect(langs).toBe("eng+deu");
    // Tesseract has the models in memory once it has started; the copies must not pile
    // up in the temporary directory with every restart (#12).
    expect(existsSync((options as { langPath: string }).langPath)).toBe(false);
  });

  it("fails at once when the worker reports an error while starting", async () => {
    // What a missing module inside the worker looks like from here: the error handler
    // fires, and the promise from createWorker never settles.
    createWorker.mockImplementationOnce((_code, _oem, options) => {
      queueMicrotask(() =>
        options.errorHandler?.(new Error("Cannot find module 'bmp-js'")),
      );
      return new Promise(() => {});
    });
    const { recogniseReceipt } = await import("./ocr");

    await expect(recogniseReceipt(image, "de")).rejects.toThrow(/bmp-js/);
  });

  it("gives up on a start that never finishes, within the time budget", async () => {
    createWorker.mockImplementationOnce(() => new Promise(() => {}));
    const { recogniseReceipt } = await import("./ocr");

    const scan = recogniseReceipt(image, "de");
    const settled = expect(scan).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(45_000);
    await settled;
  });

  it("lets the next scan start a fresh worker instead of waiting behind a stuck one", async () => {
    createWorker.mockImplementationOnce(() => new Promise(() => {}));
    const worker = workingWorker();
    createWorker.mockResolvedValue(worker);
    const { recogniseReceipt } = await import("./ocr");

    const stuck = recogniseReceipt(image, "de").catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(45_000);
    expect(await stuck).toBeInstanceOf(Error);

    await expect(recogniseReceipt(image, "de")).resolves.toMatchObject({
      text: "SUMME 12,34",
    });
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it("terminates a worker that finishes starting after it was given up on", async () => {
    let finishStart: (worker: FakeWorker) => void = () => {};
    createWorker.mockImplementationOnce(
      () => new Promise<FakeWorker>((resolve) => (finishStart = resolve)),
    );
    const { recogniseReceipt } = await import("./ocr");

    const scan = recogniseReceipt(image, "de").catch(() => undefined);
    await vi.advanceTimersByTimeAsync(45_000);
    await scan;

    const late = workingWorker();
    finishStart(late);
    await vi.advanceTimersByTimeAsync(0);
    expect(late.terminate).toHaveBeenCalled();
  });
});

describe("prepareModelDirectory", () => {
  const parents: string[] = [];
  afterEach(() => {
    for (const parent of parents.splice(0)) {
      rmSync(parent, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it("puts both language models into one fresh directory", async () => {
    const parent = mkdtempSync(join(tmpdir(), "kk-ocr-test-"));
    parents.push(parent);
    const { prepareModelDirectory } = await import("./ocr");

    const directory = prepareModelDirectory(parent);

    expect(directory).not.toBeNull();
    expect(directory!.startsWith(join(parent, "kassenknoten-tessdata-"))).toBe(true);
    expect(readdirSync(directory!).sort()).toEqual([
      "deu.traineddata.gz",
      "eng.traineddata.gz",
    ]);
    // A second call gets a directory of its own rather than reusing a predictable one.
    expect(prepareModelDirectory(parent)).not.toBe(directory);
  });

  it("answers null, leaving nothing behind, where it cannot write", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const parent = mkdtempSync(join(tmpdir(), "kk-ocr-test-"));
    parents.push(parent);
    const notADirectory = join(parent, "file");
    writeFileSync(notADirectory, "");
    const { prepareModelDirectory } = await import("./ocr");

    expect(prepareModelDirectory(notADirectory)).toBeNull();
    expect(existsSync(join(notADirectory, "kassenknoten-tessdata-"))).toBe(false);
  });
});
