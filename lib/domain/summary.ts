import { monthlyCents, sumMonthlyCents } from "./interval";
import { sumCents } from "./money";
import { splitExpense, type MemberRef, type ShareRule, type SplitMode } from "./split";
import { countedCents, type VariableCostInput } from "./variable";

export interface IncomeInput {
  memberId: number;
  amountCents: number;
  intervalMonths: number;
}

export interface ExpenseInput {
  id: number;
  label: string;
  scope: "private" | "shared";
  /** Set for private expenses, null for shared ones. */
  memberId?: number | null;
  amountCents: number;
  intervalMonths: number;
  /** Set for shared expenses, null for private ones. */
  splitMode?: SplitMode | null;
  shares?: readonly ShareRule[];
}

export interface SavingsPotInput {
  /** null means the pot belongs to the household rather than one person. */
  ownerMemberId?: number | null;
  monthlyRateCents: number;
  balanceCents: number;
  targetCents?: number | null;
}

export interface HouseholdInput {
  members: readonly MemberRef[];
  defaultShares: readonly ShareRule[];
  incomes: readonly IncomeInput[];
  expenses: readonly ExpenseInput[];
  /** Budgets for the month being summarised, with their bookings already added up. */
  variableCosts?: readonly VariableCostInput[];
  savingsPots: readonly SavingsPotInput[];
}

export interface MemberSummary {
  memberId: number;
  name: string;
  incomeCents: number;
  ownFixedCents: number;
  sharedShareCents: number;
  /** This member's own variable budgets. */
  ownVariableCents: number;
  /** This member's part of the shared variable budgets. */
  sharedVariableShareCents: number;
  savingsRateCents: number;
  /** Income minus own costs minus the share of shared costs, fixed and variable. */
  remainderCents: number;
  /** What is actually left once this member's savings rates are paid. */
  freeAfterSavingsCents: number;
}

export interface HouseholdSummary {
  incomeCents: number;
  fixedPrivateCents: number;
  fixedSharedCents: number;
  fixedTotalCents: number;
  variablePrivateCents: number;
  variableSharedCents: number;
  variableTotalCents: number;
  /** What the variable budgets planned for this month, whatever mode they are in. */
  variablePlannedCents: number;
  /** What was actually booked against them. Zero for a household that only plans. */
  variableBookedCents: number;
  savingsRateCents: number;
  savingsBalanceCents: number;
  /** Sum of the targets of pots that have one; null when no pot has a target. */
  savingsTargetCents: number | null;
  /** Income minus all costs, fixed and variable, minus all savings rates. */
  freeCashCents: number;
  members: MemberSummary[];
}

/**
 * Everything the spreadsheet used to compute with formulas, in one pure function.
 *
 * Shared costs are split per expense according to that expense's own mode, then summed
 * per member — not split once in aggregate. That difference matters as soon as two
 * expenses use different modes, and it is the reason the per-member shares always add up
 * to the shared total.
 */
export function summariseHousehold(input: HouseholdInput): HouseholdSummary {
  const monthlyIncomeByMember = incomeByMember(input);
  const context = {
    members: input.members,
    defaultShares: input.defaultShares,
    monthlyIncomeByMember,
  };

  // Retired rows are filtered out by the query layer; whatever arrives here counts.
  const privateExpenses = input.expenses.filter(
    (expense) => expense.scope === "private",
  );
  const sharedExpenses = input.expenses.filter((expense) => expense.scope === "shared");

  const ownFixedByMember = new Map<number, number>();
  for (const expense of privateExpenses) {
    if (expense.memberId == null) {
      continue;
    }
    const current = ownFixedByMember.get(expense.memberId) ?? 0;
    ownFixedByMember.set(
      expense.memberId,
      current + monthlyCents(expense.amountCents, expense.intervalMonths),
    );
  }

  const sharedByMember = new Map<number, number>();
  let fixedSharedCents = 0;
  for (const expense of sharedExpenses) {
    const result = splitExpense(
      {
        amountCents: expense.amountCents,
        intervalMonths: expense.intervalMonths,
        splitMode: expense.splitMode ?? "fixed_quota",
        shares: expense.shares,
      },
      context,
    );
    fixedSharedCents += result.monthlyCents;
    for (const share of result.perMember) {
      sharedByMember.set(
        share.memberId,
        (sharedByMember.get(share.memberId) ?? 0) + share.cents,
      );
    }
  }

  // Variable budgets are split exactly like fixed costs, so a household reads one model
  // rather than two. The only difference is which figure goes in: `countedCents` decides
  // that from the budget's mode, and it decides it once, here.
  const variableCosts = input.variableCosts ?? [];
  const ownVariableByMember = new Map<number, number>();
  let variablePrivateCents = 0;
  for (const cost of variableCosts) {
    if (cost.scope !== "private" || cost.memberId == null) {
      continue;
    }
    const amount = countedCents(cost);
    variablePrivateCents += amount;
    ownVariableByMember.set(
      cost.memberId,
      (ownVariableByMember.get(cost.memberId) ?? 0) + amount,
    );
  }

  const sharedVariableByMember = new Map<number, number>();
  let variableSharedCents = 0;
  for (const cost of variableCosts) {
    if (cost.scope !== "shared") {
      continue;
    }
    const result = splitExpense(
      {
        amountCents: countedCents(cost),
        intervalMonths: 1,
        splitMode: cost.splitMode ?? "fixed_quota",
        shares: cost.shares,
      },
      context,
    );
    variableSharedCents += result.monthlyCents;
    for (const share of result.perMember) {
      sharedVariableByMember.set(
        share.memberId,
        (sharedVariableByMember.get(share.memberId) ?? 0) + share.cents,
      );
    }
  }

  const savingsRateByMember = new Map<number, number>();
  for (const pot of input.savingsPots) {
    if (pot.ownerMemberId == null) {
      continue;
    }
    savingsRateByMember.set(
      pot.ownerMemberId,
      (savingsRateByMember.get(pot.ownerMemberId) ?? 0) + pot.monthlyRateCents,
    );
  }

  const members = input.members.map<MemberSummary>((member) => {
    const incomeCents = monthlyIncomeByMember.get(member.id) ?? 0;
    const ownFixedCents = ownFixedByMember.get(member.id) ?? 0;
    const sharedShareCents = sharedByMember.get(member.id) ?? 0;
    const ownVariableCents = ownVariableByMember.get(member.id) ?? 0;
    const sharedVariableShareCents = sharedVariableByMember.get(member.id) ?? 0;
    const savingsRateCents = savingsRateByMember.get(member.id) ?? 0;
    const remainderCents =
      incomeCents -
      ownFixedCents -
      sharedShareCents -
      ownVariableCents -
      sharedVariableShareCents;

    return {
      memberId: member.id,
      name: member.name,
      incomeCents,
      ownFixedCents,
      sharedShareCents,
      ownVariableCents,
      sharedVariableShareCents,
      savingsRateCents,
      remainderCents,
      freeAfterSavingsCents: remainderCents - savingsRateCents,
    };
  });

  const fixedPrivateCents = sumMonthlyCents(privateExpenses);
  const incomeCents = sumMonthlyCents(input.incomes);
  const savingsRateCents = sumCents(
    input.savingsPots.map((pot) => pot.monthlyRateCents),
  );
  const targets = input.savingsPots
    .map((pot) => pot.targetCents)
    .filter((target): target is number => target != null);

  const variableTotalCents = variablePrivateCents + variableSharedCents;

  return {
    incomeCents,
    fixedPrivateCents,
    fixedSharedCents,
    fixedTotalCents: fixedPrivateCents + fixedSharedCents,
    variablePrivateCents,
    variableSharedCents,
    variableTotalCents,
    variablePlannedCents: sumCents(variableCosts.map((cost) => cost.plannedCents)),
    variableBookedCents: sumCents(variableCosts.map((cost) => cost.bookedCents)),
    savingsRateCents,
    savingsBalanceCents: sumCents(input.savingsPots.map((pot) => pot.balanceCents)),
    savingsTargetCents: targets.length > 0 ? sumCents(targets) : null,
    freeCashCents:
      incomeCents -
      (fixedPrivateCents + fixedSharedCents) -
      variableTotalCents -
      savingsRateCents,
    members,
  };
}

/** Monthly net income per member, used both for display and for income-based splits. */
export function incomeByMember(input: {
  members: readonly MemberRef[];
  incomes: readonly IncomeInput[];
}): Map<number, number> {
  const result = new Map<number, number>(input.members.map((member) => [member.id, 0]));
  for (const entry of input.incomes) {
    if (!result.has(entry.memberId)) {
      continue;
    }
    result.set(
      entry.memberId,
      (result.get(entry.memberId) ?? 0) +
        monthlyCents(entry.amountCents, entry.intervalMonths),
    );
  }
  return result;
}

/**
 * How far a savings pot has come, as a fraction of its target. `null` when no target is
 * set — the spreadsheet showed an empty cell there, and an empty state is honest.
 */
export function potProgress(
  balanceCents: number,
  targetCents: number | null | undefined,
): number | null {
  if (targetCents == null || targetCents <= 0) {
    return null;
  }
  return balanceCents / targetCents;
}
