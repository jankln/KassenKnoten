import type { ShareRule, SplitMode } from "./split";

/**
 * Variable costs: the ones that are not the same every month.
 *
 * A variable cost is a budget, and the household chooses per budget how it is kept:
 *
 * - `plan` — the planned figure is the figure. Nobody writes down receipts for it, and
 *   the dashboard reports 300 € for groceries because that is the plan.
 * - `detailed` — the receipts are the figure. The planned amount stays as the budget the
 *   month is measured against, but what counts is what was actually booked.
 *
 * That single choice is the whole module, and it is here rather than in a query because
 * it decides money. `countedCents` is the only place allowed to answer "which number
 * reaches the household summary", so the screen, the dashboard and the trend cannot
 * quietly answer it three different ways.
 */
export type VariableMode = "plan" | "detailed";

export interface VariableCostInput {
  id: number;
  label: string;
  scope: "private" | "shared";
  /** Set for private budgets, null for shared ones. */
  memberId?: number | null;
  mode: VariableMode;
  plannedCents: number;
  /** What the bookings of the month being computed add up to. */
  bookedCents: number;
  /** Set for shared budgets, null for private ones. */
  splitMode?: SplitMode | null;
  shares?: readonly ShareRule[];
}

/**
 * The monthly figure this budget contributes.
 *
 * In `detailed` mode the booked sum counts from the first receipt of the month, the
 * running month included. That is the household's decision and it has a visible
 * consequence: free cash starts a month high and falls as receipts arrive. The screens
 * therefore always show booked against planned, so the number is never mistaken for a
 * plan that was met.
 */
export function countedCents(
  cost: Pick<VariableCostInput, "mode" | "plannedCents" | "bookedCents">,
): number {
  return cost.mode === "plan" ? cost.plannedCents : cost.bookedCents;
}

/**
 * How much of the budget is used, in basis points — `null` when there is no budget to
 * measure against, which is an honest empty state rather than a division by zero.
 *
 * Can exceed 10000; a budget that was overspent should say so, not stop at "100 %".
 */
export function budgetUsageBp(
  plannedCents: number,
  bookedCents: number,
): number | null {
  if (plannedCents <= 0) {
    return null;
  }
  return Math.round((bookedCents * 10_000) / plannedCents);
}

/**
 * What is left of a budget this month. Negative once it is overspent, which is the case
 * worth showing.
 */
export function remainingCents(plannedCents: number, bookedCents: number): number {
  return plannedCents - bookedCents;
}
