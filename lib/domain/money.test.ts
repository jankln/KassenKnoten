import { describe, expect, it } from "vitest";
import { allocate, FULL_SHARE_BP, ratioToBp, sumCents } from "./money";

describe("allocate", () => {
  it("splits evenly when it divides cleanly", () => {
    expect(allocate(98_000, [5000, 5000])).toEqual([49_000, 49_000]);
  });

  it("never loses a cent on an odd amount", () => {
    const parts = allocate(118_235, [5000, 5000]);
    expect(parts).toEqual([59_118, 59_117]);
    expect(sumCents(parts)).toBe(118_235);
  });

  it("handles the classic thirds case naive rounding gets wrong", () => {
    const parts = allocate(100, [1, 1, 1]);
    expect(parts).toEqual([34, 33, 33]);
    expect(sumCents(parts)).toBe(100);
  });

  it("gives leftover cents to the largest remainders first", () => {
    // Exact shares are 3.33, 3.33 and 3.34 → the third one is closest to the next cent.
    const parts = allocate(10, [1, 1, 1]);
    expect(sumCents(parts)).toBe(10);
    expect(parts).toEqual([4, 3, 3]);
  });

  it("keeps the sum exact across many random weightings", () => {
    for (let i = 0; i < 500; i += 1) {
      const total = Math.floor(Math.random() * 1_000_000);
      const weights = Array.from({ length: 2 + (i % 4) }, () =>
        Math.floor(Math.random() * 10_000),
      );
      expect(sumCents(allocate(total, weights))).toBe(total);
    }
  });

  it("falls back to an equal split when every weight is zero", () => {
    expect(allocate(101, [0, 0])).toEqual([51, 50]);
  });

  it("gives everything to a single member", () => {
    expect(allocate(98_000, [10_000])).toEqual([98_000]);
  });

  it("supports a 100/0 split", () => {
    expect(allocate(98_000, [FULL_SHARE_BP, 0])).toEqual([98_000, 0]);
  });

  it("returns nothing when there is nobody to split between", () => {
    expect(allocate(98_000, [])).toEqual([]);
  });

  it("handles negative totals without losing a cent", () => {
    const parts = allocate(-100, [1, 1, 1]);
    expect(sumCents(parts)).toBe(-100);
  });

  it("rejects fractional totals and negative weights", () => {
    expect(() => allocate(10.5, [1, 1])).toThrow(TypeError);
    expect(() => allocate(10, [1, -1])).toThrow(RangeError);
  });
});

describe("ratioToBp", () => {
  it("expresses a part as basis points", () => {
    expect(ratioToBp(49_000, 98_000)).toBe(5000);
    expect(ratioToBp(46_078, 98_000)).toBe(4702);
  });

  it("returns zero for a zero total instead of NaN", () => {
    expect(ratioToBp(0, 0)).toBe(0);
  });
});
