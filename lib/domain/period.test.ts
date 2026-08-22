import { describe, expect, it } from "vitest";
import {
  addMonths,
  comparePeriods,
  coversPeriod,
  dateFromPeriod,
  isPeriod,
  isValidRange,
  monthsBetween,
  nextPeriod,
  periodFromDate,
  periodRange,
  previousPeriod,
} from "./period";

describe("isPeriod", () => {
  it.each(["2026-01", "2026-12", "0001-01"])("accepts %s", (value) => {
    expect(isPeriod(value)).toBe(true);
  });

  it.each(["2026-13", "2026-00", "2026-1", "26-01", "2026/01", "", "0000-01"])(
    "rejects %s",
    (value) => {
      expect(isPeriod(value)).toBe(false);
    },
  );

  it("rejects values that are not strings", () => {
    expect(isPeriod(202601)).toBe(false);
    expect(isPeriod(null)).toBe(false);
    expect(isPeriod(undefined)).toBe(false);
  });
});

describe("periodFromDate", () => {
  it("uses the local calendar month", () => {
    expect(periodFromDate(new Date(2026, 0, 31))).toBe("2026-01");
    expect(periodFromDate(new Date(2026, 11, 1))).toBe("2026-12");
  });

  it("refuses an invalid date rather than inventing a month", () => {
    expect(() => periodFromDate(new Date("nope"))).toThrow();
  });
});

describe("dateFromPeriod", () => {
  it("returns the first of the month at midnight", () => {
    const date = dateFromPeriod("2026-03");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(1);
    expect(date.getHours()).toBe(0);
  });

  it("round-trips with periodFromDate", () => {
    for (const period of ["2024-02", "2026-08", "2030-12"]) {
      expect(periodFromDate(dateFromPeriod(period))).toBe(period);
    }
  });

  it("rejects a malformed period", () => {
    expect(() => dateFromPeriod("2026-13")).toThrow();
  });
});

describe("addMonths", () => {
  it("moves forwards across a year boundary", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
  });

  it("moves backwards across a year boundary", () => {
    expect(addMonths("2026-02", -3)).toBe("2025-11");
  });

  it("is the identity for zero", () => {
    expect(addMonths("2026-06", 0)).toBe("2026-06");
  });

  it("survives a long jump in both directions", () => {
    expect(addMonths("2026-01", 120)).toBe("2036-01");
    expect(addMonths("2026-01", -120)).toBe("2016-01");
  });

  // February has 28 days, adding 31 of them lands in March. Month arithmetic cannot
  // make that mistake, which is exactly why this is not done with a Date.
  it("does not skip a month when the source month is short", () => {
    expect(addMonths("2026-01", 1)).toBe("2026-02");
    expect(addMonths("2026-02", 1)).toBe("2026-03");
    expect(addMonths("2024-01", 1)).toBe("2024-02");
  });

  it("refuses to run off the start of the calendar", () => {
    expect(() => addMonths("0001-01", -1)).toThrow();
  });
});

describe("previousPeriod / nextPeriod", () => {
  it("steps one month", () => {
    expect(previousPeriod("2026-01")).toBe("2025-12");
    expect(nextPeriod("2026-12")).toBe("2027-01");
  });
});

describe("comparePeriods", () => {
  it("orders by year then month", () => {
    expect(comparePeriods("2026-01", "2026-02")).toBeLessThan(0);
    expect(comparePeriods("2027-01", "2026-12")).toBeGreaterThan(0);
    expect(comparePeriods("2026-07", "2026-07")).toBe(0);
  });

  it("sorts a list the way a reader expects", () => {
    const sorted = ["2026-10", "2025-01", "2026-02"].sort(comparePeriods);
    expect(sorted).toEqual(["2025-01", "2026-02", "2026-10"]);
  });
});

describe("monthsBetween", () => {
  it("counts forwards and backwards", () => {
    expect(monthsBetween("2026-01", "2026-01")).toBe(0);
    expect(monthsBetween("2026-01", "2026-04")).toBe(3);
    expect(monthsBetween("2026-04", "2026-01")).toBe(-3);
    expect(monthsBetween("2025-11", "2026-02")).toBe(3);
  });
});

describe("periodRange", () => {
  it("includes both ends", () => {
    expect(periodRange("2026-11", "2027-01")).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
  });

  it("returns a single month when both ends are the same", () => {
    expect(periodRange("2026-05", "2026-05")).toEqual(["2026-05"]);
  });

  it("returns nothing when the range runs backwards", () => {
    expect(periodRange("2026-05", "2026-04")).toEqual([]);
  });
});

describe("coversPeriod", () => {
  it("includes the first and the last month", () => {
    expect(coversPeriod("2026-03", "2026-03", "2026-05")).toBe(true);
    expect(coversPeriod("2026-05", "2026-03", "2026-05")).toBe(true);
  });

  it("excludes the months on either side", () => {
    expect(coversPeriod("2026-02", "2026-03", "2026-05")).toBe(false);
    expect(coversPeriod("2026-06", "2026-03", "2026-05")).toBe(false);
  });

  it("treats a missing end as open", () => {
    expect(coversPeriod("2099-12", "2026-03", null)).toBe(true);
    expect(coversPeriod("2026-02", "2026-03", null)).toBe(false);
  });

  it("covers exactly one month when both ends are the same", () => {
    expect(coversPeriod("2026-03", "2026-03", "2026-03")).toBe(true);
    expect(coversPeriod("2026-04", "2026-03", "2026-03")).toBe(false);
  });
});

describe("isValidRange", () => {
  it("accepts an open range and a well-ordered closed one", () => {
    expect(isValidRange("2026-03", null)).toBe(true);
    expect(isValidRange("2026-03", "2026-03")).toBe(true);
    expect(isValidRange("2026-03", "2027-01")).toBe(true);
  });

  it("rejects an end before the start", () => {
    expect(isValidRange("2026-03", "2026-02")).toBe(false);
  });

  it("rejects malformed periods instead of throwing", () => {
    expect(isValidRange("2026-13", null)).toBe(false);
    expect(isValidRange("2026-01", "nope")).toBe(false);
  });
});
