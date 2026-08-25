import { and, asc, eq, isNull, lte, or, gte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { monthlyCents } from "@/lib/domain/interval";
import { addMonths, periodFromDate, type Period } from "@/lib/domain/period";
import {
  incomeByMember,
  summariseHousehold,
  type HouseholdSummary,
  type ExpenseInput,
} from "@/lib/domain/summary";
import type { ShareRule } from "@/lib/domain/split";
import type { VariableCostInput } from "@/lib/domain/variable";
import { evenShares, getHouseholdSettings } from "./household";
import { listSavingsPots, type SavingsPotRow } from "./savings";
import { listVariableCosts, type VariableCostRow } from "./variable-costs";

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
  /** The month these figures describe. */
  period: Period;
  /**
   * Whether any income or fixed cost was valid in this month.
   *
   * Separate from `hasData`, which asks whether the household has been set up at all.
   * Savings pots carry a balance rather than a validity, so a month before anything was
   * entered would otherwise report a savings rate against no income and warn about a
   * shortfall that never existed.
   */
  hasEntriesInPeriod: boolean;
  summary: HouseholdSummary;
  members: DashboardMember[];
  categories: DashboardCategory[];
  /** The variable budgets of this month, with their bookings already resolved. */
  variableCosts: VariableCostRow[];
  savingsPots: SavingsPotRow[];
  hasData: boolean;
}

/**
 * Rows that applied in `period`: started on or before it, and either open-ended or not
 * yet finished. Periods are `YYYY-MM`, so a plain string comparison orders them
 * correctly and the database can use the index instead of loading every row.
 */
function appliesIn(
  period: Period,
  validFrom:
    | typeof schema.income.validFrom
    | typeof schema.expense.validFrom
    | typeof schema.variableCost.validFrom,
  validUntil:
    | typeof schema.income.validUntil
    | typeof schema.expense.validUntil
    | typeof schema.variableCost.validUntil,
) {
  return and(lte(validFrom, period), or(isNull(validUntil), gte(validUntil, period)));
}

/**
 * Read the current household state and hand the calculation to the pure domain layer.
 *
 * The query owns persistence concerns only: inactive rows are filtered here, database
 * records are mapped to the plain `HouseholdInput`, and category totals are aggregated
 * for the dashboard's presentation. All household money calculations happen in
 * `summariseHousehold`.
 */
export function getDashboardData(
  period: Period = periodFromDate(new Date()),
  db: Db = getDb(),
): DashboardData {
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
    .where(
      and(
        eq(schema.income.active, true),
        appliesIn(period, schema.income.validFrom, schema.income.validUntil),
      ),
    )
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
    .where(
      and(
        eq(schema.expense.active, true),
        appliesIn(period, schema.expense.validFrom, schema.expense.validUntil),
      ),
    )
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

  // Variable budgets need the split context, which needs the incomes that were just
  // read — so they are resolved here rather than inside `summariseHousehold`, which stays
  // pure and receives the bookings already added up.
  const monthlyIncomeByMember = incomeByMember({ members, incomes });

  const settings = getHouseholdSettings(db);
  const activeDefaultShares = settings.defaultShares.filter((share) =>
    memberIds.has(share.memberId),
  );
  const defaultShares =
    activeDefaultShares.length > 0
      ? activeDefaultShares
      : evenShares(members.map((member) => member.id));
  const savingsPots = listSavingsPots(db);

  const variableCosts = listVariableCosts(
    period,
    { members, defaultShares, monthlyIncomeByMember },
    db,
  ).filter(
    (cost) =>
      cost.scope === "shared" ||
      (cost.memberId !== null && memberIds.has(cost.memberId)),
  );

  const variableInputs: VariableCostInput[] = variableCosts.map((cost) => ({
    id: cost.id,
    label: cost.label,
    scope: cost.scope,
    memberId: cost.memberId,
    mode: cost.mode,
    plannedCents: cost.plannedCents,
    bookedCents: cost.bookedCents,
    splitMode: cost.splitMode,
    shares: cost.shares.length > 0 ? cost.shares : undefined,
  }));

  const summary = summariseHousehold({
    members,
    defaultShares,
    incomes,
    expenses,
    variableCosts: variableInputs,
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

  for (const cost of variableCosts) {
    const key = cost.categoryId === null ? "uncategorized" : String(cost.categoryId);
    const current = categoryTotals.get(key);
    if (current) {
      current.monthlyCents += cost.countedCents;
    } else {
      categoryTotals.set(key, {
        categoryId: cost.categoryId,
        name: cost.categoryName,
        icon: cost.categoryIcon,
        monthlyCents: cost.countedCents,
      });
    }
  }

  const categories = [...categoryTotals.values()].sort(
    (a, b) => b.monthlyCents - a.monthlyCents,
  );

  return {
    period,
    hasEntriesInPeriod:
      incomes.length > 0 || expenseRows.length > 0 || variableCosts.length > 0,
    summary,
    members: summaryMembers,
    categories,
    variableCosts,
    savingsPots,
    hasData:
      members.length > 0 &&
      (incomes.length > 0 ||
        expenseRows.length > 0 ||
        variableCosts.length > 0 ||
        savingsPots.length > 0),
  };
}

export interface TrendPoint {
  period: Period;
  incomeCents: number;
  fixedCostsCents: number;
  variableCostsCents: number;
  savingsRateCents: number;
  freeCashCents: number;
}

/**
 * The last `months` months, oldest first, each computed from the entries that were valid
 * in it.
 *
 * This used to read frozen snapshots. Now that entries carry their own validity the past
 * is derivable, which means a correction entered late also fixes the months it belongs
 * to — a snapshot could never do that. It costs one pass per month, which for a dozen
 * months of a single household is nothing.
 */
export function getTrend(
  endPeriod: Period = periodFromDate(new Date()),
  months = 12,
  db: Db = getDb(),
): TrendPoint[] {
  const span = Math.max(1, Math.floor(months));
  return Array.from({ length: span }, (_, index) => {
    const period = addMonths(endPeriod, index - span + 1);
    const { summary } = getDashboardData(period, db);
    return {
      period,
      incomeCents: summary.incomeCents,
      fixedCostsCents: summary.fixedTotalCents,
      variableCostsCents: summary.variableTotalCents,
      savingsRateCents: summary.savingsRateCents,
      freeCashCents: summary.freeCashCents,
    };
  });
}
