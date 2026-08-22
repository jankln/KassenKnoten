import { asc, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  isPeriod,
  periodFromDate,
  previousPeriod,
  type Period,
} from "@/lib/domain/period";
import { getDashboardData } from "./dashboard";

export interface SnapshotTrendPoint {
  period: Period;
  incomeCents: number;
  fixedPrivateCents: number;
  fixedSharedCents: number;
  fixedCostsCents: number;
  savingsRateCents: number;
  savingsBalanceCents: number;
  freeCashCents: number;
}

/**
 * Snapshots keep the one thing effective dating cannot reconstruct: what a savings pot
 * held at the end of a month. Incomes and fixed costs carry their own validity now, so
 * every other figure for a past month is computed rather than read from here.
 */

/** The previous calendar month for a request date. */
export function previousCalendarMonthPeriod(date: Date): Period {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Cannot create a period from an invalid date.");
  }
  return previousPeriod(periodFromDate(date));
}

/**
 * Freeze the current persisted plan for one period.
 *
 * The unique period constraint and the transaction make this safe when two requests
 * notice the same month at once. Existing rows are returned untouched, so a second
 * request cannot rewrite a historical snapshot.
 */
export function ensureSnapshotForPeriod(
  period: string,
  db: Db = getDb(),
  takenAt: Date = new Date(),
): schema.Snapshot {
  if (!isPeriod(period)) {
    throw new Error(`Invalid snapshot period: ${period}`);
  }
  if (Number.isNaN(takenAt.getTime())) {
    throw new Error("Cannot take a snapshot at an invalid date.");
  }

  return db.transaction((tx) => {
    const existing = tx
      .select()
      .from(schema.snapshot)
      .where(eq(schema.snapshot.period, period))
      .get();
    if (existing) {
      return existing;
    }

    // The snapshot for a month is computed for that month, not for today.
    const dashboard = getDashboardData(period, tx as unknown as Db);
    const inserted = tx
      .insert(schema.snapshot)
      .values({
        period,
        takenAt,
        incomeCents: dashboard.summary.incomeCents,
        fixedPrivateCents: dashboard.summary.fixedPrivateCents,
        fixedSharedCents: dashboard.summary.fixedSharedCents,
        savingsRateCents: dashboard.summary.savingsRateCents,
        savingsBalanceCents: dashboard.summary.savingsBalanceCents,
        freeCashCents: dashboard.summary.freeCashCents,
      })
      .onConflictDoNothing({ target: schema.snapshot.period })
      .run();

    const snapshot = tx
      .select()
      .from(schema.snapshot)
      .where(eq(schema.snapshot.period, period))
      .get();
    if (!snapshot) {
      throw new Error(`Snapshot was not created for period ${period}.`);
    }

    if (inserted.changes > 0 && dashboard.members.length > 0) {
      tx.insert(schema.snapshotMember)
        .values(
          dashboard.members.map((member) => ({
            snapshotId: snapshot.id,
            memberId: member.memberId,
            memberName: member.name,
            incomeCents: member.incomeCents,
            ownFixedCents: member.ownFixedCents,
            sharedShareCents: member.sharedShareCents,
            remainderCents: member.remainderCents,
          })),
        )
        .run();
    }

    return snapshot;
  });
}

/** Freeze the previous calendar month when an authenticated request arrives. */
export function ensurePreviousMonthSnapshot(
  date: Date = new Date(),
  db: Db = getDb(),
): schema.Snapshot {
  return ensureSnapshotForPeriod(previousCalendarMonthPeriod(date), db, date);
}

/** Read recent snapshots oldest-first for a chart or a data-list fallback. */
export function getSnapshotTrend(limit = 12, db: Db = getDb()): SnapshotTrendPoint[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (safeLimit === 0) {
    return [];
  }

  return db
    .select()
    .from(schema.snapshot)
    .orderBy(desc(schema.snapshot.period))
    .limit(safeLimit)
    .all()
    .reverse()
    .map((snapshot) => ({
      period: snapshot.period,
      incomeCents: snapshot.incomeCents,
      fixedPrivateCents: snapshot.fixedPrivateCents,
      fixedSharedCents: snapshot.fixedSharedCents,
      fixedCostsCents: snapshot.fixedPrivateCents + snapshot.fixedSharedCents,
      savingsRateCents: snapshot.savingsRateCents,
      savingsBalanceCents: snapshot.savingsBalanceCents,
      freeCashCents: snapshot.freeCashCents,
    }));
}

/** Read the member rows for one frozen period, retaining their historical names. */
export function getSnapshotMembers(
  period: string,
  db: Db = getDb(),
): schema.SnapshotMember[] {
  const snapshot = db
    .select({ id: schema.snapshot.id })
    .from(schema.snapshot)
    .where(eq(schema.snapshot.period, period))
    .get();
  if (!snapshot) {
    return [];
  }

  return db
    .select()
    .from(schema.snapshotMember)
    .where(eq(schema.snapshotMember.snapshotId, snapshot.id))
    .orderBy(asc(schema.snapshotMember.memberId))
    .all();
}
