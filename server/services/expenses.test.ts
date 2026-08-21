import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import type { SplitContext } from "@/lib/domain/split";
import { createCategory } from "./categories";
import { createMember } from "./members";
import {
  createPrivateExpense,
  createSharedExpense,
  listPrivateExpenses,
  listSharedExpenses,
  restoreExpense,
  retireExpense,
  updatePrivateExpense,
  updateSharedExpense,
} from "./expenses";

let dir: string;
let handle: ReturnType<typeof createDb>;
let alex: number;
let robin: number;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "kk-expenses-"));
  handle = createDb(join(dir, "test.db"));
  alex = createMember({ name: "Alex", colorIndex: 1 }, handle.db);
  robin = createMember({ name: "Robin", colorIndex: 2 }, handle.db);
});

afterEach(() => {
  handle.sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

function db() {
  return handle.db;
}

describe("private expenses", () => {
  it("groups costs under the person who pays them", () => {
    createPrivateExpense(
      { memberId: alex, label: "Sportverein", amountCents: 4500, intervalMonths: 1 },
      db(),
    );
    createPrivateExpense(
      { memberId: robin, label: "Musik-Abo", amountCents: 1200, intervalMonths: 1 },
      db(),
    );

    const groups = listPrivateExpenses(db());
    expect(groups.map((group) => group.name)).toEqual(["Alex", "Robin"]);
    expect(groups[0]?.expenses.map((row) => row.label)).toEqual(["Sportverein"]);
    expect(groups[1]?.expenses.map((row) => row.label)).toEqual(["Musik-Abo"]);
  });

  it("totals each person in monthly terms", () => {
    createPrivateExpense(
      { memberId: alex, label: "Sportverein", amountCents: 4500, intervalMonths: 1 },
      db(),
    );
    // 36 € a year is 3 € a month — the division the spreadsheet left to the user.
    createPrivateExpense(
      { memberId: alex, label: "Versicherung", amountCents: 3600, intervalMonths: 12 },
      db(),
    );

    const [group] = listPrivateExpenses(db());
    expect(group?.expenses.map((row) => row.monthlyCents)).toEqual([4500, 300]);
    expect(group?.monthlyCents).toBe(4800);
  });

  it("carries the category through, and copes without one", () => {
    // A name of its own: "Sport" is already seeded, and the index is unique.
    const categoryId = createCategory({ name: "Vereinssport", icon: "dumbbell" }, db());
    createPrivateExpense(
      {
        memberId: alex,
        label: "Sportverein",
        amountCents: 4500,
        intervalMonths: 1,
        categoryId,
      },
      db(),
    );
    createPrivateExpense(
      { memberId: alex, label: "Ohne Kategorie", amountCents: 900, intervalMonths: 1 },
      db(),
    );

    const rows = listPrivateExpenses(db())[0]?.expenses ?? [];
    expect(rows[0]).toMatchObject({
      categoryName: "Vereinssport",
      categoryIcon: "dumbbell",
    });
    expect(rows[1]).toMatchObject({ categoryName: null, categoryIcon: null });
  });

  it("lists a person with no costs as an empty group, not as missing", () => {
    const groups = listPrivateExpenses(db());
    expect(groups).toHaveLength(2);
    expect(groups[0]?.expenses).toEqual([]);
    expect(groups[0]?.monthlyCents).toBe(0);
  });

  it("edits an entry, including moving it to the other person", () => {
    const id = createPrivateExpense(
      { memberId: alex, label: "Sportverein", amountCents: 4500, intervalMonths: 1 },
      db(),
    );

    updatePrivateExpense(
      id,
      { memberId: robin, label: "Sportverein", amountCents: 5000, intervalMonths: 1 },
      db(),
    );

    const groups = listPrivateExpenses(db());
    expect(groups[0]?.expenses).toEqual([]);
    expect(groups[1]?.expenses[0]).toMatchObject({ amountCents: 5000 });
  });

  it("retires an entry undoably", () => {
    const id = createPrivateExpense(
      { memberId: alex, label: "Sportverein", amountCents: 4500, intervalMonths: 1 },
      db(),
    );

    retireExpense(id, db());
    expect(listPrivateExpenses(db())[0]?.monthlyCents).toBe(0);

    restoreExpense(id, db());
    expect(listPrivateExpenses(db())[0]?.monthlyCents).toBe(4500);
  });

  it("drops a retired member's costs from the list with them", () => {
    createPrivateExpense(
      { memberId: alex, label: "Sportverein", amountCents: 4500, intervalMonths: 1 },
      db(),
    );

    const groups = listPrivateExpenses(db());
    expect(groups).toHaveLength(2);
    expect(groups[0]?.expenses).toHaveLength(1);
  });
});

describe("shared expenses", () => {
  function context(): SplitContext {
    return {
      members: [
        { id: alex, name: "Alex" },
        { id: robin, name: "Robin" },
      ],
      defaultShares: [
        { memberId: alex, shareBp: 5000 },
        { memberId: robin, shareBp: 5000 },
      ],
      monthlyIncomeByMember: new Map([
        [alex, 205_000],
        [robin, 231_000],
      ]),
    };
  }

  it("splits by the quota stored with the expense", () => {
    createSharedExpense(
      {
        label: "Miete",
        amountCents: 98_000,
        intervalMonths: 1,
        splitMode: "fixed_quota",
        shares: [
          { memberId: alex, shareBp: 3000 },
          { memberId: robin, shareBp: 7000 },
        ],
      },
      db(),
    );

    const [expense] = listSharedExpenses(context(), db());
    expect(expense?.perMember.map((share) => share.cents)).toEqual([29_400, 68_600]);
  });

  it("splits by income when that is the mode, without storing a quota", () => {
    createSharedExpense(
      {
        label: "Strom",
        amountCents: 98_000,
        intervalMonths: 1,
        splitMode: "income_ratio",
      },
      db(),
    );

    const [expense] = listSharedExpenses(context(), db());
    expect(expense?.shares).toEqual([]);
    expect(expense?.perMember.map((share) => share.cents)).toEqual([46_078, 51_922]);
    expect(expense?.perMember.reduce((sum, share) => sum + share.cents, 0)).toBe(
      98_000,
    );
  });

  it("keeps a stored quota when the household default changes afterwards", () => {
    createSharedExpense(
      {
        label: "Miete",
        amountCents: 98_000,
        intervalMonths: 1,
        splitMode: "fixed_quota",
        shares: [
          { memberId: alex, shareBp: 2500 },
          { memberId: robin, shareBp: 7500 },
        ],
      },
      db(),
    );

    // The household later changes what new expenses default to.
    const changed: SplitContext = {
      ...context(),
      defaultShares: [
        { memberId: alex, shareBp: 9000 },
        { memberId: robin, shareBp: 1000 },
      ],
    };

    const [expense] = listSharedExpenses(changed, db());
    expect(expense?.perMember.map((share) => share.cents)).toEqual([24_500, 73_500]);
  });

  it("normalises a yearly amount before splitting it", () => {
    createSharedExpense(
      {
        label: "Versicherung",
        amountCents: 3600,
        intervalMonths: 12,
        splitMode: "fixed_quota",
        shares: [
          { memberId: alex, shareBp: 5000 },
          { memberId: robin, shareBp: 5000 },
        ],
      },
      db(),
    );

    const [expense] = listSharedExpenses(context(), db());
    expect(expense?.monthlyCents).toBe(300);
    expect(expense?.perMember.map((share) => share.cents)).toEqual([150, 150]);
  });

  it("never loses a cent on an amount that cannot be halved", () => {
    createSharedExpense(
      {
        label: "Internet",
        amountCents: 3999,
        intervalMonths: 1,
        splitMode: "fixed_quota",
        shares: [
          { memberId: alex, shareBp: 5000 },
          { memberId: robin, shareBp: 5000 },
        ],
      },
      db(),
    );

    const [expense] = listSharedExpenses(context(), db());
    expect(expense?.perMember.map((share) => share.cents)).toEqual([2000, 1999]);
    expect(expense?.perMember.reduce((sum, share) => sum + share.cents, 0)).toBe(3999);
  });

  it("replaces the quota when the expense is edited, leaving no stale rows", () => {
    const id = createSharedExpense(
      {
        label: "Miete",
        amountCents: 98_000,
        intervalMonths: 1,
        splitMode: "fixed_quota",
        shares: [
          { memberId: alex, shareBp: 3000 },
          { memberId: robin, shareBp: 7000 },
        ],
      },
      db(),
    );

    updateSharedExpense(
      id,
      {
        label: "Miete",
        amountCents: 98_000,
        intervalMonths: 1,
        splitMode: "income_ratio",
      },
      db(),
    );

    const [expense] = listSharedExpenses(context(), db());
    expect(expense?.shares).toEqual([]);
    expect(expense?.splitMode).toBe("income_ratio");
    expect(expense?.perMember.map((share) => share.cents)).toEqual([46_078, 51_922]);
  });
});
