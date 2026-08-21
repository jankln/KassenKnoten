import { describe, expect, it } from "vitest";
import { splitExpense, type SplitContext } from "./split";

const ALEX = { id: 1, name: "Alex" };
const ROBIN = { id: 2, name: "Robin" };

/** The example household used across the domain tests: 2050 € and 2310 € net. */
function context(overrides: Partial<SplitContext> = {}): SplitContext {
  return {
    members: [ALEX, ROBIN],
    defaultShares: [
      { memberId: ALEX.id, shareBp: 5000 },
      { memberId: ROBIN.id, shareBp: 5000 },
    ],
    monthlyIncomeByMember: new Map([
      [ALEX.id, 205_000],
      [ROBIN.id, 231_000],
    ]),
    ...overrides,
  };
}

/** The shared rent, 980,00 € per month. */
const RENT = {
  amountCents: 98_000,
  intervalMonths: 1,
  splitMode: "fixed_quota" as const,
};

describe("splitExpense with a fixed quota", () => {
  it("falls back to the household default when the expense has no shares", () => {
    const result = splitExpense(RENT, context());
    expect(result.perMember.map((share) => share.cents)).toEqual([49_000, 49_000]);
    expect(result.perMember.map((share) => share.shareBp)).toEqual([5000, 5000]);
  });

  it("prefers the expense's own shares over the household default", () => {
    const result = splitExpense(
      {
        ...RENT,
        shares: [
          { memberId: ALEX.id, shareBp: 3000 },
          { memberId: ROBIN.id, shareBp: 7000 },
        ],
      },
      context(),
    );
    expect(result.perMember.map((share) => share.cents)).toEqual([29_400, 68_600]);
  });

  it("supports one person carrying an expense alone", () => {
    const result = splitExpense(
      {
        ...RENT,
        shares: [
          { memberId: ALEX.id, shareBp: 10_000 },
          { memberId: ROBIN.id, shareBp: 0 },
        ],
      },
      context(),
    );
    expect(result.perMember.map((share) => share.cents)).toEqual([98_000, 0]);
  });

  it("splits equally when no default quota has been configured yet", () => {
    const result = splitExpense(RENT, context({ defaultShares: [] }));
    expect(result.perMember.map((share) => share.cents)).toEqual([49_000, 49_000]);
  });
});

describe("splitExpense with income proportion", () => {
  it("weights the shares by monthly income", () => {
    const result = splitExpense(
      { amountCents: 118_235, intervalMonths: 1, splitMode: "income_ratio" },
      context(),
    );
    expect(result.perMember.map((share) => share.cents)).toEqual([55_592, 62_643]);
    expect((result.perMember[0]?.cents ?? 0) + (result.perMember[1]?.cents ?? 0)).toBe(
      118_235,
    );
    // 2050 € of 4360 € is roughly 47 %, not the 50 % a single global quota is stuck with.
    expect(result.perMember[0]?.shareBp).toBe(4702);
  });

  it("falls back to an equal split when nobody has entered an income yet", () => {
    const result = splitExpense(
      { amountCents: 98_000, intervalMonths: 1, splitMode: "income_ratio" },
      context({ monthlyIncomeByMember: new Map() }),
    );
    expect(result.perMember.map((share) => share.cents)).toEqual([49_000, 49_000]);
  });
});

describe("splitExpense with non-monthly intervals", () => {
  it("normalises to a month before splitting", () => {
    const result = splitExpense(
      { amountCents: 3600, intervalMonths: 12, splitMode: "fixed_quota" },
      context(),
    );
    expect(result.monthlyCents).toBe(300);
    expect(result.perMember.map((share) => share.cents)).toEqual([150, 150]);
  });

  it("still adds up when the monthly amount is odd", () => {
    const result = splitExpense(
      { amountCents: 10_001, intervalMonths: 1, splitMode: "fixed_quota" },
      context(),
    );
    expect(result.perMember.map((share) => share.cents)).toEqual([5001, 5000]);
  });
});

describe("splitExpense with a third member", () => {
  it("distributes the remainder deterministically", () => {
    const kim = { id: 3, name: "Kim" };
    const result = splitExpense(
      { amountCents: 100, intervalMonths: 1, splitMode: "fixed_quota" },
      context({
        members: [ALEX, ROBIN, kim],
        defaultShares: [
          { memberId: ALEX.id, shareBp: 3333 },
          { memberId: ROBIN.id, shareBp: 3333 },
          { memberId: kim.id, shareBp: 3334 },
        ],
      }),
    );
    expect(result.perMember.map((share) => share.cents)).toEqual([33, 33, 34]);
  });

  it("gives nothing to a member who is not part of the quota", () => {
    const kim = { id: 3, name: "Kim" };
    const result = splitExpense(RENT, context({ members: [ALEX, ROBIN, kim] }));
    expect(result.perMember.map((share) => share.cents)).toEqual([49_000, 49_000, 0]);
  });
});
