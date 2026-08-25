import { beforeEach, describe, expect, it } from "vitest";
import { createReplayGuard, type ReplayGuard } from "./totp-replay";

let guard: ReplayGuard;

beforeEach(() => {
  guard = createReplayGuard();
});

describe("createReplayGuard", () => {
  it("accepts a step the first time", () => {
    expect(guard.consume(1000)).toBe(true);
  });

  it("refuses the same step again — the code has been spent", () => {
    guard.consume(1000);
    expect(guard.consume(1000)).toBe(false);
    expect(guard.consume(1000)).toBe(false);
  });

  /**
   * The case a "codes I have seen" set would miss: after moving on, an older code from
   * inside the tolerance window must not become usable again.
   */
  it("refuses an earlier step after a later one was used", () => {
    guard.consume(1000);
    expect(guard.consume(999)).toBe(false);
    expect(guard.consume(1)).toBe(false);
  });

  it("accepts the next step", () => {
    guard.consume(1000);
    expect(guard.consume(1001)).toBe(true);
    expect(guard.consume(1002)).toBe(true);
  });

  it("starts fresh after a reset", () => {
    guard.consume(1000);
    guard.reset();
    expect(guard.consume(1000)).toBe(true);
  });
});
