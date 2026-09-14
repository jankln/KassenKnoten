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
  terminate: ReturnType<typeof vi.fn>;
};

const createWorker =
  vi.fn<(code: string, oem: number, options: Options) => Promise<FakeWorker>>();
vi.mock("tesseract.js", () => ({ createWorker }));

function workingWorker(text = "SUMME 12,34"): FakeWorker {
  return {
    recognize: vi.fn(async () => ({ data: { text, confidence: 90 } })),
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
