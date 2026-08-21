import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { monthlyCents } from "@/lib/domain/interval";
import {
  summariseHousehold,
  type HouseholdSummary,
  type ExpenseInput,
} from "@/lib/domain/summary";
import type { ShareRule } from "@/lib/domain/split";
import { evenShares, getHouseholdSettings } from "./household";
import { listSavingsPots, type SavingsPotRow } from "./savings";

export interface DashboardCategory {
  categoryId: number | null;
  name: string | null;
  icon: string | null;
  monthlyCents: number;
}

export type DashboardMember = HouseholdSummary["members"][number] & {
  colorIndex: number;
};

export interface DashboardData {
  summary: HouseholdSummary;
  members: DashboardMember[];
  categories: DashboardCategory[];
  savingsPots: SavingsPotRow[];
  hasData: boolean;
}

/**
 * Read the current household state and hand the calculation to the pure domain layer.
 *
 * The query owns persistence concerns only: inactive rows are filtered here, database
 * records are mapped to the plain `HouseholdInput`, and category totals are aggregated
 * for the dashboard's presentation. All household money calculations happen in
 * `summariseHousehold`.
 */
export function getDashboardData(db: Db = getDb()): DashboardData {
  const members = db
    .select({
      id: schema.member.id,
      name: schema.member.name,
      colorIndex: schema.member.colorIndex,
    })
    .from(schema.member)
    .where(eq(schema.member.active, true))
    .orderBy(asc(schema.member.sortOrder), asc(schema.member.id))
    .all();
  const memberIds = new Set(members.map((member) => member.id));

  const incomes = db
    .select({
      memberId: schema.income.memberId,
      amountCents: schema.income.amountCents,
      intervalMonths: schema.income.intervalMonths,
    })
    .from(schema.income)
    .where(eq(schema.income.active, true))
    .all()
    .filter((income) => memberIds.has(income.memberId));

  const expenseRows = db
    .select({
      id: schema.expense.id,
      label: schema.expense.label,
      scope: schema.expense.scope,
      memberId: schema.expense.memberId,
      amountCents: schema.expense.amountCents,
      intervalMonths: schema.expense.intervalMonths,
      splitMode: schema.expense.splitMode,
      categoryId: schema.category.id,
      categoryName: schema.category.name,
      categoryIcon: schema.category.icon,
    })
    .from(schema.expense)
    .leftJoin(schema.category, eq(schema.expense.categoryId, schema.category.id))
    .where(eq(schema.expense.active, true))
    .orderBy(asc(schema.expense.sortOrder), asc(schema.expense.id))
    .all()
    .filter(
      (expense) =>
        expense.scope === "shared" ||
        expense.memberId === null ||
        memberIds.has(expense.memberId),
    );

  const shares = db.select().from(schema.expenseShare).all();
  const sharesByExpense = new Map<number, ShareRule[]>();
  for (const share of shares) {
    const current = sharesByExpense.get(share.expenseId) ?? [];
    current.push({ memberId: share.memberId, shareBp: share.shareBp });
    sharesByExpense.set(share.expenseId, current);
  }

  const expenses: ExpenseInput[] = expenseRows.map((expense) => ({
    id: expense.id,
    label: expense.label,
    scope: expense.scope,
    memberId: expense.memberId,
    amountCents: expense.amountCents,
    intervalMonths: expense.intervalMonths,
    splitMode: expense.splitMode,
    shares: sharesByExpense.get(expense.id),
  }));

  const settings = getHouseholdSettings(db);
  const activeDefaultShares = settings.defaultShares.filter((share) =>
    memberIds.has(share.memberId),
  );
  const defaultShares =
    activeDefaultShares.length > 0
      ? activeDefaultShares
      : evenShares(members.map((member) => member.id));
  const savingsPots = listSavingsPots(db);

  const summary = summariseHousehold({
    members,
    defaultShares,
    incomes,
    expenses,
    savingsPots: savingsPots.map((pot) => ({
      ownerMemberId: pot.ownerMemberId,
      monthlyRateCents: pot.monthlyRateCents,
      balanceCents: pot.balanceCents,
      targetCents: pot.targetCents,
    })),
  });

  const colorByMember = new Map(
    members.map((member) => [member.id, member.colorIndex]),
  );
  const summaryMembers = summary.members.map((member) => ({
    ...member,
    colorIndex: colorByMember.get(member.memberId) ?? 1,
  }));

  const categoryTotals = new Map<string, DashboardCategory>();
  for (const expense of expenseRows) {
    const key =
      expense.categoryId === null ? "uncategorized" : String(expense.categoryId);
    const current = categoryTotals.get(key);
    const amount = monthlyCents(expense.amountCents, expense.intervalMonths);
    if (current) {
      current.monthlyCents += amount;
    } else {
      categoryTotals.set(key, {
        categoryId: expense.categoryId,
        name: expense.categoryName,
        icon: expense.categoryIcon,
        monthlyCents: amount,
      });
    }
  }

  const categories = [...categoryTotals.values()].sort(
    (a, b) => b.monthlyCents - a.monthlyCents,
  );

  return {
    summary,
    members: summaryMembers,
    categories,
    savingsPots,
    hasData:
      members.length > 0 &&
      (incomes.length > 0 || expenseRows.length > 0 || savingsPots.length > 0),
  };
}
