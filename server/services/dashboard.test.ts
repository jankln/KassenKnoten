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
      .values({
        memberId: alex,
        label: "Gehalt",
        amountCents: 200_000,
        validFrom: "2026-01",
      })
      .run();
    handle.db
      .insert(schema.expense)
      .values({
        scope: "private",
        memberId: alex,
        categoryId: category?.id ?? null,
        label: "Miete",
        amountCents: 80_000,
        validFrom: "2026-01",
      })
      .run();
    handle.db
      .insert(schema.savingsPot)
      .values({ name: "Reserve", monthlyRateCents: 10_000, balanceCents: 25_000 })
      .run();

    const dashboard = getDashboardData("2026-01", handle.db);

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
      .values({
        memberId: member,
        label: "Gehalt",
        amountCents: 100_000,
        validFrom: "2026-01",
      })
      .run();

    expect(getDashboardData("2026-01", handle.db)).toMatchObject({
      hasData: false,
      summary: { incomeCents: 0 },
      members: [],
    });
  });
});

describe("effective dating", () => {
  function member(name: string, colorIndex: number): number {
    return handle.db
      .insert(schema.member)
      .values({ name, colorIndex })
      .returning({ id: schema.member.id })
      .get().id;
  }

  // The point of the whole feature: a raise in March must not rewrite February.
  it("keeps a month reporting the salary that was valid in it", () => {
    const alex = member("Alex", 1);
    handle.db
      .insert(schema.income)
      .values([
        {
          memberId: alex,
          label: "Gehalt",
          amountCents: 205_000,
          validFrom: "2026-01",
          validUntil: "2026-02",
        },
        {
          memberId: alex,
          label: "Gehalt",
          amountCents: 220_000,
          validFrom: "2026-03",
        },
      ])
      .run();

    expect(getDashboardData("2026-02", handle.db).summary.incomeCents).toBe(205_000);
    expect(getDashboardData("2026-03", handle.db).summary.incomeCents).toBe(220_000);
    expect(getDashboardData("2026-09", handle.db).summary.incomeCents).toBe(220_000);
  });

  it("shows nothing for a month before the entry starts", () => {
    const alex = member("Alex", 1);
    handle.db
      .insert(schema.income)
      .values({
        memberId: alex,
        label: "Gehalt",
        amountCents: 205_000,
        validFrom: "2026-03",
      })
      .run();

    expect(getDashboardData("2026-02", handle.db).summary.incomeCents).toBe(0);
    expect(getDashboardData("2026-03", handle.db).summary.incomeCents).toBe(205_000);
  });

  it("drops a fixed cost again once it has ended", () => {
    const alex = member("Alex", 1);
    handle.db
      .insert(schema.expense)
      .values({
        scope: "private",
        memberId: alex,
        label: "Fitnessstudio",
        amountCents: 2_990,
        validFrom: "2026-01",
        validUntil: "2026-04",
      })
      .run();

    expect(getDashboardData("2026-04", handle.db).summary.fixedTotalCents).toBe(2_990);
    expect(getDashboardData("2026-05", handle.db).summary.fixedTotalCents).toBe(0);
  });

  it("reports the month it was asked about", () => {
    expect(getDashboardData("2026-07", handle.db).period).toBe("2026-07");
  });
});

describe("months without any entries", () => {
  it("reports that nothing applied, even though savings pots are undated", () => {
    const alex = handle.db
      .insert(schema.member)
      .values({ name: "Alex", colorIndex: 1 })
      .returning({ id: schema.member.id })
      .get().id;
    handle.db
      .insert(schema.savingsPot)
      .values({ name: "Notgroschen", monthlyRateCents: 40_000 })
      .run();
    handle.db
      .insert(schema.income)
      .values({
        memberId: alex,
        label: "Gehalt",
        amountCents: 205_000,
        validFrom: "2026-07",
      })
      .run();

    // Without this flag June would show a 400 € savings rate against no income and warn
    // about a shortfall that never happened.
    expect(getDashboardData("2026-06", handle.db).hasEntriesInPeriod).toBe(false);
    expect(getDashboardData("2026-07", handle.db).hasEntriesInPeriod).toBe(true);
  });
});
