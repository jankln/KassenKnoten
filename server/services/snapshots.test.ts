import { afterEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  ensurePreviousMonthSnapshot,
  ensureSnapshotForPeriod,
  getSnapshotMembers,
  getSnapshotTrend,
  previousCalendarMonthPeriod,
} from "./snapshots";

const handle = createDb(":memory:");

afterEach(() => {
  handle.db.delete(schema.snapshotMember).run();
  handle.db.delete(schema.snapshot).run();
  handle.db.delete(schema.expenseShare).run();
  handle.db.delete(schema.expense).run();
  handle.db.delete(schema.income).run();
  handle.db.delete(schema.savingsPot).run();
  handle.db.delete(schema.member).run();
});

describe("snapshot periods", () => {
  it("handles calendar boundaries explicitly", () => {
    const date = new Date(2026, 0, 15);

    expect(previousCalendarMonthPeriod(date)).toBe("2025-12");
    expect(previousCalendarMonthPeriod(new Date(2026, 0, 1))).toBe("2025-12");
  });
});

describe("snapshot creation", () => {
  it("captures the previous month and is idempotent", () => {
    const alex = handle.db
      .insert(schema.member)
      .values({ name: "Alex" })
      .returning({ id: schema.member.id })
      .get().id;
    const robin = handle.db
      .insert(schema.member)
      .values({ name: "Robin" })
      .returning({ id: schema.member.id })
      .get().id;

    handle.db
      .insert(schema.income)
      .values([
        { memberId: alex, label: "Gehalt", amountCents: 205_000, validFrom: "2026-01" },
        {
          memberId: robin,
          label: "Gehalt",
          amountCents: 231_000,
          validFrom: "2026-01",
        },
      ])
      .run();
    handle.db
      .insert(schema.expense)
      .values({
        scope: "shared",
        splitMode: "fixed_quota",
        label: "Gemeinsame Kosten",
        amountCents: 118_235,
        validFrom: "2026-01",
      })
      .returning({ id: schema.expense.id })
      .get();

    const requestDate = new Date(2026, 8, 3);
    const first = ensurePreviousMonthSnapshot(requestDate, handle.db);
    const second = ensurePreviousMonthSnapshot(requestDate, handle.db);

    expect(first).toMatchObject({
      period: "2026-08",
      incomeCents: 436_000,
      fixedSharedCents: 118_235,
      freeCashCents: 317_765,
    });
    expect(second.id).toBe(first.id);
    expect(handle.db.select().from(schema.snapshot).all()).toHaveLength(1);
    expect(getSnapshotMembers("2026-08", handle.db)).toEqual([
      expect.objectContaining({
        memberId: alex,
        memberName: "Alex",
        incomeCents: 205_000,
      }),
      expect.objectContaining({
        memberId: robin,
        memberName: "Robin",
        incomeCents: 231_000,
      }),
    ]);
  });

  it("does not overwrite an existing period", () => {
    const original = ensureSnapshotForPeriod(
      "2026-07",
      handle.db,
      new Date(2026, 7, 1),
    );
    const again = ensureSnapshotForPeriod("2026-07", handle.db, new Date(2026, 8, 1));

    expect(again).toEqual(original);
    expect(handle.db.select().from(schema.snapshot).all()).toHaveLength(1);
  });
});

describe("snapshot trend", () => {
  it("returns recent months oldest-first with fixed costs derived", () => {
    handle.db
      .insert(schema.snapshot)
      .values([
        {
          period: "2026-06",
          incomeCents: 400_000,
          fixedPrivateCents: 80_000,
          fixedSharedCents: 120_000,
          savingsRateCents: 20_000,
          savingsBalanceCents: 100_000,
          freeCashCents: 180_000,
        },
        {
          period: "2026-07",
          incomeCents: 410_000,
          fixedPrivateCents: 90_000,
          fixedSharedCents: 125_000,
          savingsRateCents: 25_000,
          savingsBalanceCents: 125_000,
          freeCashCents: 170_000,
        },
      ])
      .run();

    expect(getSnapshotTrend(2, handle.db)).toEqual([
      expect.objectContaining({
        period: "2026-06",
        fixedCostsCents: 200_000,
      }),
      expect.objectContaining({
        period: "2026-07",
        fixedCostsCents: 215_000,
      }),
    ]);
  });
});
