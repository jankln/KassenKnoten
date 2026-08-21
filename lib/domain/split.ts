import { monthlyCents } from "./interval";
import { allocate, ratioToBp } from "./money";

export type SplitMode = "fixed_quota" | "income_ratio";

export interface MemberRef {
  id: number;
  name: string;
}

export interface ShareRule {
  memberId: number;
  shareBp: number;
}

export interface SplitContext {
  /** Members the cost is split between, in display order. */
  members: readonly MemberRef[];
  /** The household's default quota. Used when an expense has no shares of its own. */
  defaultShares: readonly ShareRule[];
  /** Monthly net income per member id, used by the income-proportional mode. */
  monthlyIncomeByMember: ReadonlyMap<number, number>;
}

export interface SharedExpenseInput {
  amountCents: number;
  intervalMonths: number;
  splitMode: SplitMode;
  /** Per-expense override of the quota. Absent means "use the household default". */
  shares?: readonly ShareRule[];
}

export interface MemberShare {
  memberId: number;
  name: string;
  /** This member's part of the monthly amount, in cents. */
  cents: number;
  /** The effective share this works out to, for display ("37 %"). */
  shareBp: number;
}

export interface SplitResult {
  /** The expense normalised to a monthly amount. */
  monthlyCents: number;
  perMember: MemberShare[];
}

/**
 * Split one shared expense between the members.
 *
 * The parts are guaranteed to sum to exactly `monthlyCents` — see `allocate`. Which
 * weights are used depends on the mode the user picked for this specific expense; the
 * household default only ever pre-fills the form, it is never applied behind their back.
 */
export function splitExpense(
  expense: SharedExpenseInput,
  context: SplitContext,
): SplitResult {
  const total = monthlyCents(expense.amountCents, expense.intervalMonths);
  const weights = weightsFor(expense, context);
  const parts = allocate(total, weights);

  return {
    monthlyCents: total,
    perMember: context.members.map((member, index) => ({
      memberId: member.id,
      name: member.name,
      cents: parts[index] ?? 0,
      shareBp: ratioToBp(parts[index] ?? 0, total),
    })),
  };
}

function weightsFor(expense: SharedExpenseInput, context: SplitContext): number[] {
  if (expense.splitMode === "income_ratio") {
    // Everyone earning nothing (or no income entered yet) falls back to an equal
    // split inside `allocate`, rather than throwing at the user mid-form.
    return context.members.map(
      (member) => context.monthlyIncomeByMember.get(member.id) ?? 0,
    );
  }

  const rules = expense.shares ?? context.defaultShares;
  const byMember = new Map(rules.map((rule) => [rule.memberId, rule.shareBp]));
  return context.members.map((member) => byMember.get(member.id) ?? 0);
}
