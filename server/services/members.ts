import { and, asc, eq, max } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { sumMonthlyCents } from "@/lib/domain/interval";
import {
  comparePeriods,
  coversPeriod,
  periodFromDate,
  previousPeriod,
  type Period,
} from "@/lib/domain/period";
import {
  MAX_COLOR_INDEX,
  type IncomeInput,
  type MemberInput,
} from "@/lib/validation/member";

/**
 * Everything the household screen reads and writes.
 *
 * The database handle is a parameter with a default, so tests can run the real logic
 * against a temporary file instead of mocking a layer that would then prove nothing.
 */

export interface IncomeRow {
  id: number;
  validFrom: Period;
  validUntil: Period | null;
  label: string;
  kind: "salary" | "other";
  amountCents: number;
  intervalMonths: number;
  /** The amount normalised to a month, which is what the plan works in. */
  monthlyCents: number;
}

export interface MemberWithIncome {
  id: number;
  name: string;
  colorIndex: number;
  /** Every income on record, including the ones outside `period`. */
  incomes: IncomeRow[];
  /** What this person earns in `period`, per month. */
  monthlyIncomeCents: number;
}

/**
 * Everyone in the household with their income.
 *
 * The rows are complete — a raise that starts in September is listed in August, because
 * the screen you enter it on is the screen that has to show it back to you — but the
 * totals count only what actually applies in `period`. A figure that is not being earned
 * yet must not raise what the household earns today, and it must not shift an
 * income-ratio split either, since those read `monthlyIncomeCents`.
 */
export async function listMembersWithIncome(
  db: Db = getDb(),
  period: Period = periodFromDate(new Date()),
): Promise<MemberWithIncome[]> {
  const members = db
    .select()
    .from(schema.member)
    .where(eq(schema.member.active, true))
    .orderBy(asc(schema.member.sortOrder), asc(schema.member.id))
    .all();

  const incomes = db
    .select()
    .from(schema.income)
    .where(eq(schema.income.active, true))
    .orderBy(asc(schema.income.id))
    .all();

  return members.map((member) => {
    const own = incomes
      .filter((entry) => entry.memberId === member.id)
      .map<IncomeRow>((entry) => ({
        id: entry.id,
        label: entry.label,
        kind: entry.kind,
        amountCents: entry.amountCents,
        intervalMonths: entry.intervalMonths,
        validFrom: entry.validFrom,
        validUntil: entry.validUntil,
        monthlyCents: sumMonthlyCents([entry]),
      }));

    return {
      id: member.id,
      name: member.name,
      colorIndex: member.colorIndex,
      incomes: own,
      monthlyIncomeCents: sumMonthlyCents(
        own.filter((entry) => coversPeriod(period, entry.validFrom, entry.validUntil)),
      ),
    };
  });
}

/** The colour nobody is using yet, so two people never start out indistinguishable. */
export function nextFreeColorIndex(db: Db = getDb()): number {
  const used = new Set(
    db
      .select({ colorIndex: schema.member.colorIndex })
      .from(schema.member)
      .where(eq(schema.member.active, true))
      .all()
      .map((row) => row.colorIndex),
  );

  for (let index = 1; index <= MAX_COLOR_INDEX; index += 1) {
    if (!used.has(index)) {
      return index;
    }
  }
  return 1;
}

export function createMember(input: MemberInput, db: Db = getDb()): number {
  const highest =
    db
      .select({ value: max(schema.member.sortOrder) })
      .from(schema.member)
      .get()?.value ?? 0;

  return db
    .insert(schema.member)
    .values({ ...input, sortOrder: highest + 1 })
    .returning({ id: schema.member.id })
    .get().id;
}

export function updateMember(id: number, input: MemberInput, db: Db = getDb()): void {
  db.update(schema.member)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.member.id, id))
    .run();
}

/**
 * Retire a person instead of deleting them. Their income goes with them, but the rows
 * survive, so an accidental tap is undoable and past months keep resolving to a name.
 */
export function retireMember(id: number, db: Db = getDb()): void {
  db.update(schema.member)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.member.id, id))
    .run();
}

export function restoreMember(id: number, db: Db = getDb()): void {
  db.update(schema.member)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(schema.member.id, id))
    .run();
}

export function createIncome(input: IncomeInput, db: Db = getDb()): number {
  return db
    .insert(schema.income)
    .values(input)
    .returning({ id: schema.income.id })
    .get().id;
}

/**
 * Save an income, splitting it in two when it starts applying later than it used to.
 *
 * A raise is not a correction. Moving `validFrom` forward means "this is what it is from
 * then on", so the existing row keeps its amount and is closed at the preceding month,
 * and the new figure starts a row of its own. January keeps reporting January.
 *
 * Leaving `validFrom` where it was is the other intent — a typo, a wrong interval — and
 * rewrites the row in place, including for the months it already covered.
 *
 * Returns the id of the row that now carries `input`, which is a new one after a split.
 */
export function updateIncome(id: number, input: IncomeInput, db: Db = getDb()): number {
  return db.transaction((tx) => {
    const existing = tx
      .select({
        validFrom: schema.income.validFrom,
        validUntil: schema.income.validUntil,
      })
      .from(schema.income)
      .where(eq(schema.income.id, id))
      .get();

    if (existing && comparePeriods(input.validFrom, existing.validFrom) > 0) {
      const closeAt = previousPeriod(input.validFrom);
      tx.update(schema.income)
        .set({ validUntil: closeAt, updatedAt: new Date() })
        .where(eq(schema.income.id, id))
        .run();

      return tx
        .insert(schema.income)
        .values({
          ...input,
          // A range the old row already ended before would be invisible in every month.
          validUntil: keepLaterEnd(existing.validUntil, input.validUntil),
        })
        .returning({ id: schema.income.id })
        .get().id;
    }

    tx.update(schema.income)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.income.id, id))
      .run();
    return id;
  });
}

/**
 * The end date a split-off row should carry.
 *
 * The form's value wins when it has one. Otherwise the old row's end carries over: an
 * entry that was already planned to stop in June does not become open-ended just because
 * its amount changed in March.
 */
function keepLaterEnd(previous: Period | null, next: Period | null): Period | null {
  return next ?? previous;
}

export function removeIncome(id: number, db: Db = getDb()): void {
  db.update(schema.income)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.income.id, id))
    .run();
}

export function restoreIncome(id: number, db: Db = getDb()): void {
  db.update(schema.income)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(schema.income.id, id))
    .run();
}

/** Guard for actions: an id must belong to a row that actually exists. */
export function memberExists(id: number, db: Db = getDb()): boolean {
  return (
    db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(and(eq(schema.member.id, id), eq(schema.member.active, true)))
      .get() !== undefined
  );
}
