import { afterEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import * as schema from "@/db/schema";
import { getDashboardData } from "./dashboard";

const handle = createDb(":memory:");

afterEach(() => {
  handle.db.delete(schema.expenseShare).run();
  handle.db.delete(schema.expense).run();
  handle.db.delete(schema.income).run();
  handle.db.delete(schema.savingsPot).run();
  handle.db.delete(schema.member).run();
});

describe("dashboard query", () => {
  it("assembles active rows for the pure summary and categories", () => {
    const alex = handle.db
      .insert(schema.member)
      .values({ name: "Alex", colorIndex: 1 })
      .returning({ id: schema.member.id })
      .get().id;
    const category = handle.db
      .select({ id: schema.category.id })
      .from(schema.category)
      .get();

    handle.db
      .insert(schema.income)
      .values({ memberId: alex, label: "Gehalt", amountCents: 200_000 })
      .run();
    handle.db
      .insert(schema.expense)
      .values({
        scope: "private",
        memberId: alex,
        categoryId: category?.id ?? null,
        label: "Miete",
        amountCents: 80_000,
      })
      .run();
    handle.db
      .insert(schema.savingsPot)
      .values({ name: "Reserve", monthlyRateCents: 10_000, balanceCents: 25_000 })
      .run();

    const dashboard = getDashboardData(handle.db);

    expect(dashboard.summary).toMatchObject({
      incomeCents: 200_000,
      fixedTotalCents: 80_000,
      savingsRateCents: 10_000,
      freeCashCents: 110_000,
    });
    expect(dashboard.members[0]).toMatchObject({
      name: "Alex",
      colorIndex: 1,
      ownFixedCents: 80_000,
    });
    expect(dashboard.categories).toEqual([
      expect.objectContaining({ categoryId: category?.id, monthlyCents: 80_000 }),
    ]);
    expect(dashboard.hasData).toBe(true);
  });

  it("ignores inactive members and their active-looking rows", () => {
    const member = handle.db
      .insert(schema.member)
      .values({ name: "Robin", active: false })
      .returning({ id: schema.member.id })
      .get().id;
    handle.db
      .insert(schema.income)
      .values({ memberId: member, label: "Gehalt", amountCents: 100_000 })
      .run();

    expect(getDashboardData(handle.db)).toMatchObject({
      hasData: false,
      summary: { incomeCents: 0 },
      members: [],
    });
  });
});
