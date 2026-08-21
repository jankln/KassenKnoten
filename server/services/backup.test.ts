import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb } from "@/db/client";
import * as schema from "@/db/schema";
import { createCategory } from "./categories";
import {
  exportBackup,
  exportPlanningCsv,
  parseBackup,
  parseBackupJson,
  RestoreValidationError,
  restoreBackup,
} from "./backup";

let handle: ReturnType<typeof createDb>;

beforeEach(() => {
  handle = createDb(":memory:");
});

afterEach(() => {
  handle.sqlite.close();
});

function seedHouseholdData() {
  const members = handle.db
    .insert(schema.member)
    .values([
      { name: "Alex", colorIndex: 1 },
      { name: "Robin", colorIndex: 2 },
    ])
    .returning({ id: schema.member.id })
    .all();
  const categoryId = createCategory({ name: "Haustier", icon: "cat" }, handle.db);
  const incomeId = handle.db
    .insert(schema.income)
    .values({
      memberId: members[0]!.id,
      label: "Gehalt",
      amountCents: 205000,
      intervalMonths: 1,
    })
    .returning({ id: schema.income.id })
    .get().id;
  const expenseId = handle.db
    .insert(schema.expense)
    .values({
      scope: "shared",
      label: "Miete",
      categoryId,
      amountCents: 118235,
      intervalMonths: 1,
      splitMode: "fixed_quota",
    })
    .returning({ id: schema.expense.id })
    .get().id;

  handle.db
    .insert(schema.defaultShare)
    .values([
      { memberId: members[0]!.id, shareBp: 5000 },
      { memberId: members[1]!.id, shareBp: 5000 },
    ])
    .run();
  handle.db
    .insert(schema.expenseShare)
    .values([
      { expenseId, memberId: members[0]!.id, shareBp: 4700 },
      { expenseId, memberId: members[1]!.id, shareBp: 5300 },
    ])
    .run();
  handle.db
    .insert(schema.savingsPot)
    .values({
      name: "Urlaub",
      ownerMemberId: members[1]!.id,
      monthlyRateCents: 12000,
      balanceCents: 50000,
      targetCents: 100000,
    })
    .run();
  const snapshotId = handle.db
    .insert(schema.snapshot)
    .values({
      period: "2026-08",
      incomeCents: 205000,
      fixedPrivateCents: 0,
      fixedSharedCents: 118235,
      savingsRateCents: 12000,
      savingsBalanceCents: 50000,
      freeCashCents: 74765,
    })
    .returning({ id: schema.snapshot.id })
    .get().id;
  handle.db
    .insert(schema.snapshotMember)
    .values({
      snapshotId,
      memberId: members[0]!.id,
      memberName: "Alex",
      incomeCents: 205000,
      ownFixedCents: 0,
      sharedShareCents: 55600,
      remainderCents: 0,
    })
    .run();
  handle.db
    .insert(schema.appSetting)
    .values({
      key: "last_snapshot_run",
      value: { period: "2026-08" },
    })
    .run();
  return { incomeId, expenseId, categoryId };
}

describe("backup", () => {
  it("round-trips every persisted household table", () => {
    seedHouseholdData();
    const exported = exportBackup(handle.db, new Date("2026-08-21T12:00:00.000Z"));
    const json = JSON.stringify(exported);

    // Restore into a fresh, normally seeded database so system-category preservation is
    // exercised rather than bypassed.
    handle.sqlite.close();
    handle = createDb(":memory:");
    restoreBackup(parseBackupJson(json), handle.db);

    expect(exportBackup(handle.db, new Date("2026-08-21T12:00:00.000Z"))).toEqual(
      exported,
    );
    expect(handle.db.select().from(schema.appSetting).all()).toHaveLength(1);
    expect(handle.db.select().from(schema.snapshotMember).all()).toHaveLength(1);
  });

  it("rejects unsupported versions and invalid references before changing data", () => {
    seedHouseholdData();
    const exported = exportBackup(handle.db);
    const invalid = structuredClone(exported);
    invalid.incomes[0]!.memberId = 999;

    expect(() => parseBackup(invalid)).toThrow(RestoreValidationError);
    expect(() => parseBackup({ ...exported, version: 99 })).toThrow(
      RestoreValidationError,
    );
    expect(handle.db.select().from(schema.member).all()).toHaveLength(2);
  });

  it("keeps seeded system categories and exports useful active planning rows as CSV", () => {
    seedHouseholdData();
    const before = handle.db
      .select({ id: schema.category.id })
      .from(schema.category)
      .where(eq(schema.category.isSystem, true))
      .all();

    restoreBackup(exportBackup(handle.db), handle.db);

    const after = handle.db
      .select({ id: schema.category.id })
      .from(schema.category)
      .where(eq(schema.category.isSystem, true))
      .all();
    expect(after).toEqual(before);
    const csv = exportPlanningCsv(handle.db);
    expect(csv).toContain("Bezeichnung");
    expect(csv).toContain("Miete");
    expect(csv).toContain("Urlaub");
  });
});
