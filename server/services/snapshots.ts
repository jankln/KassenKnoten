import { asc, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { getDashboardData } from "./dashboard";

const PERIOD_PATTERN = /^(\d{4})-(\d{2})$/;

export interface SnapshotTrendPoint {
  period: string;
  incomeCents: number;
  fixedPrivateCents: number;
  fixedSharedCents: number;
  fixedCostsCents: number;
  savingsRateCents: number;
  savingsBalanceCents: number;
  freeCashCents: number;
}

/** Return the local calendar period represented by a date. */
export function periodFromDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Cannot create a period from an invalid date.");
  }
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

/** Return the first day of a calendar period in the local timezone. */
export function dateFromPeriod(period: string): Date {
  const match = PERIOD_PATTERN.exec(period);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  if (!match || year < 1 || month < 1 || month > 12) {
    throw new Error(`Invalid snapshot period: ${period}`);
  }
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, 1);
  return date;
}

export function isSnapshotPeriod(period: string): boolean {
  try {
    dateFromPeriod(period);
    return true;
  } catch {
    return false;
  }
}

/** Return the previous calendar month for a request date. */
export function previousCalendarMonthPeriod(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Cannot create a period from an invalid date.");
  }
  return periodFromDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
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
  dateFromPeriod(period);
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

    const dashboard = getDashboardData(tx as unknown as Db);
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
