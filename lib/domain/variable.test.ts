import { describe, expect, it } from "vitest";
import { budgetUsageBp, countedCents, remainingCents } from "./variable";

describe("countedCents", () => {
  it("counts the plan in plan mode, whatever was booked", () => {
    expect(
      countedCents({ mode: "plan", plannedCents: 30_000, bookedCents: 12_345 }),
    ).toBe(30_000);
  });

  it("counts the bookings in detailed mode, even when they are under the budget", () => {
    expect(
      countedCents({ mode: "detailed", plannedCents: 30_000, bookedCents: 12_345 }),
    ).toBe(12_345);
  });

  it("counts an overspent detailed budget at what it actually cost", () => {
    expect(
      countedCents({ mode: "detailed", plannedCents: 30_000, bookedCents: 41_000 }),
    ).toBe(41_000);
  });

  it("counts nothing for a detailed budget with no receipts yet", () => {
    expect(
      countedCents({ mode: "detailed", plannedCents: 30_000, bookedCents: 0 }),
    ).toBe(0);
  });
});

describe("budgetUsageBp", () => {
  it("reports the share of the budget that is used", () => {
    expect(budgetUsageBp(30_000, 15_000)).toBe(5_000);
    expect(budgetUsageBp(30_000, 30_000)).toBe(10_000);
  });

  it("goes past 100 % rather than capping, so overspending is visible", () => {
    expect(budgetUsageBp(30_000, 45_000)).toBe(15_000);
  });

  it("has no answer without a budget", () => {
    expect(budgetUsageBp(0, 4_200)).toBeNull();
    expect(budgetUsageBp(-1, 4_200)).toBeNull();
  });

  it("rounds to whole basis points", () => {
    expect(budgetUsageBp(30_000, 10_000)).toBe(3_333);
  });
});

describe("remainingCents", () => {
  it("is what is left of the budget", () => {
    expect(remainingCents(30_000, 12_000)).toBe(18_000);
  });

  it("goes negative once the budget is overspent", () => {
    expect(remainingCents(30_000, 41_000)).toBe(-11_000);
  });
});
