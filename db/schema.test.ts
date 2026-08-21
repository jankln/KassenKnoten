import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "./client";
import { SYSTEM_CATEGORIES } from "./seed";
import * as schema from "./schema";

let dir: string;
let handle: ReturnType<typeof createDb>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "kassenknoten-test-"));
  handle = createDb(join(dir, "test.db"));
});

afterEach(() => {
  handle.sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

function addMember(name: string) {
  return handle.db
    .insert(schema.member)
    .values({ name })
    .returning({ id: schema.member.id })
    .get();
}

describe("migrations and seed", () => {
  it("creates the singleton household exactly once", () => {
    seedTwice();
    const rows = handle.db.select().from(schema.household).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(1);
    expect(rows[0]?.defaultSplitMode).toBe("fixed_quota");
  });

  it("seeds the system categories idempotently", () => {
    seedTwice();
    const rows = handle.db.select().from(schema.category).all();
    expect(rows).toHaveLength(SYSTEM_CATEGORIES.length);
    expect(rows.every((row) => row.isSystem)).toBe(true);
  });

  it("refuses a second household row", () => {
    expect(() =>
      handle.db.insert(schema.household).values({ id: 2, name: "Zweiter" }).run(),
    ).toThrow();
  });

  function seedTwice() {
    // Re-opening the same file runs migrate + seed again, which is what every boot does.
    handle.sqlite.close();
    handle = createDb(join(dir, "test.db"));
  }
});

describe("expense shape constraints", () => {
  it("accepts a private expense owned by a member", () => {
    const member = addMember("Alex");
    handle.db
      .insert(schema.expense)
      .values({
        scope: "private",
        memberId: member.id,
        label: "Sportverein",
        amountCents: 4500,
      })
      .run();

    const rows = handle.db.select().from(schema.expense).all();
    expect(rows[0]?.amountCents).toBe(4500);
    expect(rows[0]?.splitMode).toBeNull();
  });

  it("rejects a private expense without an owner", () => {
    expect(() =>
      handle.db
        .insert(schema.expense)
        .values({ scope: "private", label: "Sportverein", amountCents: 4500 })
        .run(),
    ).toThrow();
  });

  it("rejects a shared expense without a split mode", () => {
    expect(() =>
      handle.db
        .insert(schema.expense)
        .values({ scope: "shared", label: "Miete", amountCents: 98000 })
        .run(),
    ).toThrow();
  });

  it("rejects a shared expense that also has an owner", () => {
    const member = addMember("Alex");
    expect(() =>
      handle.db
        .insert(schema.expense)
        .values({
          scope: "shared",
          memberId: member.id,
          splitMode: "fixed_quota",
          label: "Miete",
          amountCents: 98000,
        })
        .run(),
    ).toThrow();
  });

  it("rejects negative amounts and non-positive intervals", () => {
    const member = addMember("Alex");
    expect(() =>
      handle.db
        .insert(schema.expense)
        .values({
          scope: "private",
          memberId: member.id,
          label: "Fehler",
          amountCents: -1,
        })
        .run(),
    ).toThrow();
    expect(() =>
      handle.db
        .insert(schema.expense)
        .values({
          scope: "private",
          memberId: member.id,
          label: "Fehler",
          intervalMonths: 0,
        })
        .run(),
    ).toThrow();
  });
});

describe("referential integrity", () => {
  it("cascades member deletion to income, expenses and shares", () => {
    const member = addMember("Robin");
    handle.db
      .insert(schema.income)
      .values({ memberId: member.id, label: "Gehalt", amountCents: 231000 })
      .run();
    const shared = handle.db
      .insert(schema.expense)
      .values({
        scope: "shared",
        splitMode: "fixed_quota",
        label: "Miete",
        amountCents: 98000,
      })
      .returning({ id: schema.expense.id })
      .get();
    handle.db
      .insert(schema.expenseShare)
      .values({ expenseId: shared.id, memberId: member.id, shareBp: 5000 })
      .run();

    handle.db.delete(schema.member).where(eq(schema.member.id, member.id)).run();

    expect(handle.db.select().from(schema.income).all()).toHaveLength(0);
    expect(handle.db.select().from(schema.expenseShare).all()).toHaveLength(0);
    // The shared expense itself survives: it belongs to the household, not the person.
    expect(handle.db.select().from(schema.expense).all()).toHaveLength(1);
  });

  it("keeps an expense when its category is removed", () => {
    const category = handle.db
      .insert(schema.category)
      .values({ name: "Eigene Kategorie" })
      .returning({ id: schema.category.id })
      .get();
    const member = addMember("Alex");
    handle.db
      .insert(schema.expense)
      .values({
        scope: "private",
        memberId: member.id,
        categoryId: category.id,
        label: "Musik-Abo",
        amountCents: 999,
      })
      .run();

    handle.db.delete(schema.category).where(eq(schema.category.id, category.id)).run();

    const rows = handle.db.select().from(schema.expense).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.categoryId).toBeNull();
  });

  it("rejects an expense share pointing at a missing member", () => {
    const shared = handle.db
      .insert(schema.expense)
      .values({
        scope: "shared",
        splitMode: "income_ratio",
        label: "Strom",
        amountCents: 7000,
      })
      .returning({ id: schema.expense.id })
      .get();

    expect(() =>
      handle.db
        .insert(schema.expenseShare)
        .values({ expenseId: shared.id, memberId: 999, shareBp: 10000 })
        .run(),
    ).toThrow();
  });
});

describe("snapshots", () => {
  it("allows one snapshot per period", () => {
    const values = {
      period: "2026-08",
      incomeCents: 411000,
      fixedPrivateCents: 16610,
      fixedSharedCents: 135036,
      savingsRateCents: 106000,
      savingsBalanceCents: 2200000,
      freeCashCents: 153354,
    };
    handle.db.insert(schema.snapshot).values(values).run();
    expect(() => handle.db.insert(schema.snapshot).values(values).run()).toThrow();
  });
});
