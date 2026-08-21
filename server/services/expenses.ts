import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { monthlyCents } from "@/lib/domain/interval";

/**
 * Fixed costs.
 *
 * Written for both scopes from the start even though only private costs have a screen
 * yet: totals that are computed in two places drift apart, and F09 would only have to
 * merge them back together.
 */

export interface ExpenseRow {
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
}): ExpenseRow {
  return {
    id: entry.id,
    label: entry.label,
    amountCents: entry.amountCents,
    intervalMonths: entry.intervalMonths,
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

export function createPrivateExpense(
  input: {
    memberId: number;
    label: string;
    amountCents: number;
    intervalMonths: number;
    categoryId?: number | null;
  },
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
    })
    .returning({ id: schema.expense.id })
    .get().id;
}

export function updatePrivateExpense(
  id: number,
  input: {
    memberId: number;
    label: string;
    amountCents: number;
    intervalMonths: number;
    categoryId?: number | null;
  },
  db: Db = getDb(),
): void {
  db.update(schema.expense)
    .set({
      memberId: input.memberId,
      label: input.label,
      amountCents: input.amountCents,
      intervalMonths: input.intervalMonths,
      categoryId: input.categoryId ?? null,
      updatedAt: new Date(),
    })
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
