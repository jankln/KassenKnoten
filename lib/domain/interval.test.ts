import { describe, expect, it } from "vitest";
import { monthlyCents, sumMonthlyCents, yearlyCents } from "./interval";

describe("monthlyCents", () => {
  it("passes monthly amounts through untouched", () => {
    expect(monthlyCents(98_000, 1)).toBe(98_000);
  });

  it("divides a yearly amount into months", () => {
    // A 36 € yearly insurance, which a spreadsheet makes you divide by hand.
    expect(monthlyCents(3600, 12)).toBe(300);
  });

  it("rounds to the nearest cent", () => {
    expect(monthlyCents(10_000, 12)).toBe(833);
    expect(monthlyCents(5000, 3)).toBe(1667);
  });

  it("rejects an interval that is not a positive integer", () => {
    expect(() => monthlyCents(1000, 0)).toThrow(RangeError);
    expect(() => monthlyCents(1000, -1)).toThrow(RangeError);
    expect(() => monthlyCents(1000, 1.5)).toThrow(RangeError);
  });
});

describe("yearlyCents", () => {
  it("scales any interval up to a year", () => {
    expect(yearlyCents(2000, 1)).toBe(24_000);
    expect(yearlyCents(3600, 12)).toBe(3600);
    expect(yearlyCents(5000, 3)).toBe(20_000);
  });
});

describe("sumMonthlyCents", () => {
  it("sums the rounded monthly values, matching what the rows display", () => {
    const total = sumMonthlyCents([
      { amountCents: 10_000, intervalMonths: 12 }, // 833
      { amountCents: 10_000, intervalMonths: 12 }, // 833
      { amountCents: 2000, intervalMonths: 1 }, // 2000
    ]);
    expect(total).toBe(3666);
  });
});
