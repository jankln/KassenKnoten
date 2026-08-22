import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { comparePeriods, previousPeriod, type Period } from "@/lib/domain/period";
import { monthlyCents } from "@/lib/domain/interval";
import {
  splitExpense,
  type MemberShare,
  type SplitContext,
  type SplitMode,
} from "@/lib/domain/split";

/**
 * Fixed costs.
 *
 * Written for both scopes from the start even though only private costs have a screen
 * yet: totals that are computed in two places drift apart, and F09 would only have to
 * merge them back together.
 */

export interface ExpenseRow extends Validity {
  id: number;
  label: string;
  amountCents: number;
  intervalMonths: number;
  /** The amount normalised to a month, which is what the plan works in. */
  monthlyCents: number;
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  splitMode: "fixed_quota" | "income_ratio" | null;
}

export interface MemberExpenses {
  memberId: number;
  name: string;
  colorIndex: number;
  expenses: ExpenseRow[];
  monthlyCents: number;
}

function selectExpenses(db: Db, scope: "private" | "shared") {
  return db
    .select({
      id: schema.expense.id,
      memberId: schema.expense.memberId,
      label: schema.expense.label,
      amountCents: schema.expense.amountCents,
      intervalMonths: schema.expense.intervalMonths,
      validFrom: schema.expense.validFrom,
      validUntil: schema.expense.validUntil,
      splitMode: schema.expense.splitMode,
      categoryId: schema.category.id,
      categoryName: schema.category.name,
      categoryIcon: schema.category.icon,
    })
    .from(schema.expense)
    .leftJoin(schema.category, eq(schema.expense.categoryId, schema.category.id))
    .where(and(eq(schema.expense.scope, scope), eq(schema.expense.active, true)))
    .orderBy(asc(schema.expense.sortOrder), asc(schema.expense.id))
    .all();
}

function toRow(entry: {
  id: number;
  label: string;
  amountCents: number;
  intervalMonths: number;
  splitMode: "fixed_quota" | "income_ratio" | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  validFrom: string;
  validUntil: string | null;
}): ExpenseRow {
  return {
    id: entry.id,
    label: entry.label,
    amountCents: entry.amountCents,
    intervalMonths: entry.intervalMonths,
    validFrom: entry.validFrom,
    validUntil: entry.validUntil,
    monthlyCents: monthlyCents(entry.amountCents, entry.intervalMonths),
    categoryId: entry.categoryId,
    categoryName: entry.categoryName,
    categoryIcon: entry.categoryIcon,
    splitMode: entry.splitMode,
  };
}

/** Private costs, grouped under the person who pays them. */
export function listPrivateExpenses(db: Db = getDb()): MemberExpenses[] {
  const members = db
    .select()
    .from(schema.member)
    .where(eq(schema.member.active, true))
    .orderBy(asc(schema.member.sortOrder), asc(schema.member.id))
    .all();

  const rows = selectExpenses(db, "private");

  return members.map((member) => {
    const own = rows
      .filter((row) => row.memberId === member.id)
      .map((row) => toRow(row));

    return {
      memberId: member.id,
      name: member.name,
      colorIndex: member.colorIndex,
      expenses: own,
      monthlyCents: own.reduce((total, row) => total + row.monthlyCents, 0),
    };
  });
}

/** The months an entry applies to, carried by every write. */
export interface Validity {
  validFrom: Period;
  validUntil: Period | null;
}

/**
 * Whether saving `next` over a row that currently starts at `current` means "from now
 * on" rather than "this was always wrong".
 *
 * Moving the start forward is a change of plan — a rent increase, a subscription that got
 * more expensive — and must leave the earlier months reporting what they reported. Leaving
 * it alone is a correction and rewrites the row in place.
 */
function startsLater(current: Period, next: Period): boolean {
  return comparePeriods(next, current) > 0;
}

export interface PrivateExpenseWrite extends Validity {
  memberId: number;
  label: string;
  amountCents: number;
  intervalMonths: number;
  categoryId?: number | null;
}

export function createPrivateExpense(
  input: PrivateExpenseWrite,
  db: Db = getDb(),
): number {
  return db
    .insert(schema.expense)
    .values({
      scope: "private",
      memberId: input.memberId,
      label: input.label,
      amountCents: input.amountCents,
      intervalMonths: input.intervalMonths,
      categoryId: input.categoryId ?? null,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
    })
    .returning({ id: schema.expense.id })
    .get().id;
}

/** Splits the row when it starts applying later — see `startsLater`. */
export function updatePrivateExpense(
  id: number,
  input: PrivateExpenseWrite,
  db: Db = getDb(),
): number {
  return db.transaction((tx) => {
    const existing = readValidity(tx as unknown as Db, id);

    if (existing && startsLater(existing.validFrom, input.validFrom)) {
      closeAt(tx as unknown as Db, id, previousPeriod(input.validFrom));
      return tx
        .insert(schema.expense)
        .values({
          scope: "private",
          memberId: input.memberId,
          label: input.label,
          amountCents: input.amountCents,
          intervalMonths: input.intervalMonths,
          categoryId: input.categoryId ?? null,
          validFrom: input.validFrom,
          validUntil: input.validUntil ?? existing.validUntil,
        })
        .returning({ id: schema.expense.id })
        .get().id;
    }

    tx.update(schema.expense)
      .set({
        memberId: input.memberId,
        label: input.label,
        amountCents: input.amountCents,
        intervalMonths: input.intervalMonths,
        categoryId: input.categoryId ?? null,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        updatedAt: new Date(),
      })
      .where(eq(schema.expense.id, id))
      .run();
    return id;
  });
}

function readValidity(db: Db, id: number): Validity | undefined {
  return db
    .select({
      validFrom: schema.expense.validFrom,
      validUntil: schema.expense.validUntil,
    })
    .from(schema.expense)
    .where(eq(schema.expense.id, id))
    .get();
}

function closeAt(db: Db, id: number, period: Period): void {
  db.update(schema.expense)
    .set({ validUntil: period, updatedAt: new Date() })
    .where(eq(schema.expense.id, id))
    .run();
}

/** Retire rather than delete, so removing one is undoable and history stays intact. */
export function retireExpense(id: number, db: Db = getDb()): void {
  db.update(schema.expense)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.expense.id, id))
    .run();
}

export function restoreExpense(id: number, db: Db = getDb()): void {
  db.update(schema.expense)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(schema.expense.id, id))
    .run();
}

/* ------------------------------------------------------------------------- *
 * Shared expenses
 * ------------------------------------------------------------------------- */

export interface SharedExpenseRow extends ExpenseRow {
  splitMode: SplitMode;
  /** The quota stored with this expense, empty when it splits by income. */
  shares: { memberId: number; shareBp: number }[];
  /** What each person actually pays this month, to the cent. */
  perMember: MemberShare[];
}

/**
 * Shared costs with their split already resolved.
 *
 * The split is computed by `splitExpense` from `lib/domain` — the same pure function the
 * form previews with, so what the household sees before saving is what gets stored.
 */
export function listSharedExpenses(
  context: SplitContext,
  db: Db = getDb(),
): SharedExpenseRow[] {
  const rows = selectExpenses(db, "shared");
  const shares = db.select().from(schema.expenseShare).all();

  return rows.map((row) => {
    const own = shares
      .filter((share) => share.expenseId === row.id)
      .map((share) => ({ memberId: share.memberId, shareBp: share.shareBp }));
    const splitMode = row.splitMode ?? "fixed_quota";

    const result = splitExpense(
      {
        amountCents: row.amountCents,
        intervalMonths: row.intervalMonths,
        splitMode,
        ...(own.length > 0 ? { shares: own } : {}),
      },
      context,
    );

    return {
      ...toRow(row),
      splitMode,
      shares: own,
      perMember: result.perMember,
    };
  });
}

export interface SharedExpenseWrite extends Validity {
  label: string;
  amountCents: number;
  intervalMonths: number;
  categoryId?: number | null;
  splitMode: SplitMode;
  /** Required for a fixed quota, ignored when splitting by income. */
  shares?: { memberId: number; shareBp: number }[];
}

/**
 * Write a shared expense and its quota in one transaction.
 *
 * The quota is stored even when it matches the household default: the household decided
 * it for *this* expense, and changing the default later must not silently re-split
 * everything that came before.
 */
export function createSharedExpense(
  input: SharedExpenseWrite,
  db: Db = getDb(),
): number {
  return db.transaction((tx) => {
    const id = tx
      .insert(schema.expense)
      .values({
        scope: "shared",
        memberId: null,
        label: input.label,
        amountCents: input.amountCents,
        intervalMonths: input.intervalMonths,
        categoryId: input.categoryId ?? null,
        splitMode: input.splitMode,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
      })
      .returning({ id: schema.expense.id })
      .get().id;

    writeShares(tx as unknown as Db, id, input);
    return id;
  });
}

/** Splits the row when it starts applying later — see `startsLater`. */
export function updateSharedExpense(
  id: number,
  input: SharedExpenseWrite,
  db: Db = getDb(),
): number {
  return db.transaction((tx) => {
    const existing = readValidity(tx as unknown as Db, id);

    if (existing && startsLater(existing.validFrom, input.validFrom)) {
      closeAt(tx as unknown as Db, id, previousPeriod(input.validFrom));
      const created = tx
        .insert(schema.expense)
        .values({
          scope: "shared",
          memberId: null,
          label: input.label,
          amountCents: input.amountCents,
          intervalMonths: input.intervalMonths,
          categoryId: input.categoryId ?? null,
          splitMode: input.splitMode,
          validFrom: input.validFrom,
          validUntil: input.validUntil ?? existing.validUntil,
        })
        .returning({ id: schema.expense.id })
        .get().id;
      // The quota belongs to the new row; the closed one keeps the one it was split by.
      writeShares(tx as unknown as Db, created, input);
      return created;
    }

    tx.update(schema.expense)
      .set({
        label: input.label,
        amountCents: input.amountCents,
        intervalMonths: input.intervalMonths,
        categoryId: input.categoryId ?? null,
        splitMode: input.splitMode,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        updatedAt: new Date(),
      })
      .where(eq(schema.expense.id, id))
      .run();

    tx.delete(schema.expenseShare).where(eq(schema.expenseShare.expenseId, id)).run();
    writeShares(tx as unknown as Db, id, input);
    return id;
  });
}

function writeShares(db: Db, expenseId: number, input: SharedExpenseWrite): void {
  if (input.splitMode !== "fixed_quota" || !input.shares?.length) {
    return;
  }
  db.insert(schema.expenseShare)
    .values(input.shares.map((share) => ({ ...share, expenseId })))
    .run();
}
