import { describe, expect, it } from "vitest";
import {
  incomeByMember,
  potProgress,
  summariseHousehold,
  type ExpenseInput,
  type HouseholdInput,
} from "./summary";

const ALEX = { id: 1, name: "Alex" };
const ROBIN = { id: 2, name: "Robin" };

let nextId = 0;
function privateExpense(memberId: number, amountCents: number): ExpenseInput {
  nextId += 1;
  return {
    id: nextId,
    label: `private-${nextId}`,
    scope: "private",
    memberId,
    amountCents,
    intervalMonths: 1,
  };
}

function sharedExpense(amountCents: number): ExpenseInput {
  nextId += 1;
  return {
    id: nextId,
    label: `shared-${nextId}`,
    scope: "shared",
    memberId: null,
    amountCents,
    intervalMonths: 1,
    splitMode: "fixed_quota",
  };
}

/**
 * An example household with the same shape as the spreadsheet this app replaces:
 * two people with unequal incomes, private costs each, a block of shared costs and a
 * handful of savings pots. The figures are chosen so the totals exercise the awkward
 * cases — 1182,35 € of shared costs cannot be halved evenly, so the per-person shares
 * only add up if the largest-remainder split is correct.
 */
function exampleHousehold(): HouseholdInput {
  nextId = 0;
  return {
    members: [ALEX, ROBIN],
    defaultShares: [
      { memberId: ALEX.id, shareBp: 5000 },
      { memberId: ROBIN.id, shareBp: 5000 },
    ],
    incomes: [
      { memberId: ALEX.id, amountCents: 184_000, intervalMonths: 1 },
      { memberId: ALEX.id, amountCents: 21_000, intervalMonths: 1 },
      { memberId: ROBIN.id, amountCents: 231_000, intervalMonths: 1 },
    ],
    expenses: [
      // Alex, private: six small subscriptions and memberships
      privateExpense(ALEX.id, 1290),
      privateExpense(ALEX.id, 900),
      privateExpense(ALEX.id, 4500),
      privateExpense(ALEX.id, 1190),
      privateExpense(ALEX.id, 750),
      privateExpense(ALEX.id, 300),
      // Robin, private
      privateExpense(ROBIN.id, 2999),
      privateExpense(ROBIN.id, 1200),
      privateExpense(ROBIN.id, 5800),
      privateExpense(ROBIN.id, 500),
      privateExpense(ROBIN.id, 1990),
      privateExpense(ROBIN.id, 300),
      // Shared: rent, electricity, internet, broadcast fee, two insurances, a reserve
      sharedExpense(98_000),
      sharedExpense(8250),
      sharedExpense(3999),
      sharedExpense(1836),
      sharedExpense(990),
      sharedExpense(660),
      sharedExpense(4500),
    ],
    savingsPots: [
      { ownerMemberId: ALEX.id, monthlyRateCents: 15_000, balanceCents: 340_000 },
      { ownerMemberId: ROBIN.id, monthlyRateCents: 27_500, balanceCents: 0 },
      { ownerMemberId: ROBIN.id, monthlyRateCents: 12_000, balanceCents: 0 },
      { ownerMemberId: ALEX.id, monthlyRateCents: 2500, balanceCents: 815_000 },
      { ownerMemberId: ROBIN.id, monthlyRateCents: 9000, balanceCents: 0 },
    ],
  };
}

describe("summariseHousehold on the example household", () => {
  const summary = summariseHousehold(exampleHousehold());

  it("totals the income", () => {
    expect(summary.incomeCents).toBe(436_000);
  });

  it("totals the fixed costs the way the three blocks did", () => {
    expect(summary.fixedPrivateCents).toBe(21_719);
    expect(summary.fixedSharedCents).toBe(118_235);
    expect(summary.fixedTotalCents).toBe(139_954);
  });

  it("totals the savings rates and balances", () => {
    expect(summary.savingsRateCents).toBe(66_000);
    expect(summary.savingsBalanceCents).toBe(1_155_000);
    expect(summary.savingsTargetCents).toBeNull();
  });

  it("computes the free cash of 2300,46 €", () => {
    expect(summary.freeCashCents).toBe(230_046);
  });

  it("breaks the month down per person", () => {
    const [alex, robin] = summary.members;

    expect(alex).toMatchObject({
      name: "Alex",
      incomeCents: 205_000,
      ownFixedCents: 8930,
      sharedShareCents: 59_118,
      savingsRateCents: 17_500,
      remainderCents: 136_952,
      freeAfterSavingsCents: 119_452,
    });

    expect(robin).toMatchObject({
      name: "Robin",
      incomeCents: 231_000,
      ownFixedCents: 12_789,
      // One cent less than Alex: 1182,35 € cannot be halved evenly, and the largest
      // remainder decides who carries it.
      sharedShareCents: 59_117,
      savingsRateCents: 48_500,
      remainderCents: 159_094,
      freeAfterSavingsCents: 110_594,
    });
  });

  it("leaves no cent unaccounted for between the household and the people", () => {
    const perMember = summary.members.reduce(
      (total, member) => total + member.remainderCents,
      0,
    );
    expect(perMember).toBe(summary.incomeCents - summary.fixedTotalCents);

    const sharedPerMember = summary.members.reduce(
      (total, member) => total + member.sharedShareCents,
      0,
    );
    expect(sharedPerMember).toBe(summary.fixedSharedCents);
  });
});

describe("summariseHousehold with mixed split modes", () => {
  it("splits every expense by its own mode instead of splitting the total", () => {
    const base = exampleHousehold();
    const summary = summariseHousehold({
      ...base,
      expenses: [
        { ...sharedExpense(98_000), splitMode: "income_ratio" },
        { ...sharedExpense(8250), splitMode: "fixed_quota" },
      ],
    });

    // 980 € by income (47/53) plus 82,50 € halved.
    expect(summary.members[0]?.sharedShareCents).toBe(46_078 + 4125);
    expect(summary.members[1]?.sharedShareCents).toBe(51_922 + 4125);
    expect(
      (summary.members[0]?.sharedShareCents ?? 0) +
        (summary.members[1]?.sharedShareCents ?? 0),
    ).toBe(summary.fixedSharedCents);
  });
});

describe("summariseHousehold edge cases", () => {
  it("survives an empty household", () => {
    const summary = summariseHousehold({
      members: [],
      defaultShares: [],
      incomes: [],
      expenses: [],
      savingsPots: [],
    });
    expect(summary.freeCashCents).toBe(0);
    expect(summary.members).toEqual([]);
    expect(summary.savingsTargetCents).toBeNull();
  });

  it("reports negative free cash instead of hiding it", () => {
    const summary = summariseHousehold({
      members: [ALEX],
      defaultShares: [{ memberId: ALEX.id, shareBp: 10_000 }],
      incomes: [{ memberId: ALEX.id, amountCents: 100_000, intervalMonths: 1 }],
      expenses: [sharedExpense(90_000)],
      savingsPots: [
        { ownerMemberId: ALEX.id, monthlyRateCents: 30_000, balanceCents: 0 },
      ],
    });
    expect(summary.freeCashCents).toBe(-20_000);
    expect(summary.members[0]?.freeAfterSavingsCents).toBe(-20_000);
  });

  it("counts a household pot in the total but in nobody's personal savings", () => {
    const summary = summariseHousehold({
      members: [ALEX, ROBIN],
      defaultShares: [],
      incomes: [],
      expenses: [],
      savingsPots: [
        { ownerMemberId: null, monthlyRateCents: 5000, balanceCents: 100_000 },
      ],
    });
    expect(summary.savingsRateCents).toBe(5000);
    expect(summary.members.every((member) => member.savingsRateCents === 0)).toBe(true);
  });

  it("sums only the targets that are actually set", () => {
    const summary = summariseHousehold({
      members: [ALEX],
      defaultShares: [],
      incomes: [],
      expenses: [],
      savingsPots: [
        {
          ownerMemberId: ALEX.id,
          monthlyRateCents: 0,
          balanceCents: 0,
          targetCents: 500_000,
        },
        { ownerMemberId: ALEX.id, monthlyRateCents: 0, balanceCents: 0 },
      ],
    });
    expect(summary.savingsTargetCents).toBe(500_000);
  });

  it("normalises non-monthly entries before totalling", () => {
    const summary = summariseHousehold({
      members: [ALEX],
      defaultShares: [],
      incomes: [{ memberId: ALEX.id, amountCents: 120_000, intervalMonths: 12 }],
      expenses: [
        { ...privateExpense(ALEX.id, 3600), intervalMonths: 12 },
        { ...sharedExpense(1200), intervalMonths: 3 },
      ],
      savingsPots: [],
    });
    expect(summary.incomeCents).toBe(10_000);
    expect(summary.fixedPrivateCents).toBe(300);
    expect(summary.fixedSharedCents).toBe(400);
  });
});

describe("incomeByMember", () => {
  it("adds up every income source of a person", () => {
    const result = incomeByMember({
      members: [ALEX, ROBIN],
      incomes: [
        { memberId: ALEX.id, amountCents: 184_000, intervalMonths: 1 },
        { memberId: ALEX.id, amountCents: 21_000, intervalMonths: 1 },
        { memberId: ROBIN.id, amountCents: 231_000, intervalMonths: 1 },
      ],
    });
    expect(result.get(ALEX.id)).toBe(205_000);
    expect(result.get(ROBIN.id)).toBe(231_000);
  });

  it("lists a member without income as zero rather than missing", () => {
    const result = incomeByMember({ members: [ALEX], incomes: [] });
    expect(result.get(ALEX.id)).toBe(0);
  });

  it("ignores income belonging to an unknown member", () => {
    const result = incomeByMember({
      members: [ALEX],
      incomes: [{ memberId: 99, amountCents: 1000, intervalMonths: 1 }],
    });
    expect(result.get(ALEX.id)).toBe(0);
    expect(result.size).toBe(1);
  });
});

describe("potProgress", () => {
  it("returns the fraction reached", () => {
    expect(potProgress(700_000, 1_000_000)).toBeCloseTo(0.7);
  });

  it("returns null without a target, which is what an unset goal means", () => {
    expect(potProgress(700_000, null)).toBeNull();
    expect(potProgress(700_000, undefined)).toBeNull();
    expect(potProgress(700_000, 0)).toBeNull();
  });

  it("can exceed 1 when a pot is over its target", () => {
    expect(potProgress(1_200_000, 1_000_000)).toBeCloseTo(1.2);
  });
});
