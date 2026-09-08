import type { Messages } from "@/lib/i18n";

/**
 * The series the trend draws, and their colours.
 *
 * Its own module because both halves of the trend need it: the chart is a client island
 * that has to react to a pointer, while the data list under it stays server-rendered. A
 * shared definition is what keeps a colour from meaning one series in the picture and
 * another in the table.
 */
export const trendSeries = [
  { key: "incomeCents", color: "var(--color-member-1)" },
  { key: "fixedCostsCents", color: "var(--color-member-2)" },
  { key: "variableCostsCents", color: "var(--color-member-4)" },
  { key: "savingsRateCents", color: "var(--color-member-3)" },
  { key: "freeCashCents", color: "var(--color-brass)" },
] as const;

export type TrendKey = (typeof trendSeries)[number]["key"];

export function trendLabel(t: Messages, key: TrendKey): string {
  const labels: Record<TrendKey, string> = {
    incomeCents: t.sections.overview.trend.income,
    fixedCostsCents: t.sections.overview.trend.fixedCosts,
    variableCostsCents: t.sections.overview.trend.variableCosts,
    savingsRateCents: t.sections.overview.trend.savingsRate,
    freeCashCents: t.sections.overview.trend.freeCash,
  };
  return labels[key];
}
