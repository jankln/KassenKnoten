import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import { createCategory } from "./categories";
import { createMember } from "./members";
import {
  createPrivateExpense,
  listPrivateExpenses,
  restoreExpense,
  retireExpense,
  updatePrivateExpense,
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
