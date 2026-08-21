/**
 * Recurrence handling.
 *
 * An entry stores the amount as it is actually charged plus how many months lie between
 * two charges (1 = monthly, 12 = yearly). The planning views work in monthly figures, so
 * everything is normalised here — the division the spreadsheet forced on the user by hand.
 */

export const MONTHS_PER_YEAR = 12;

/**
 * Monthly equivalent of a recurring amount, rounded to the cent.
 *
 * Rounding happens per entry, and totals sum these rounded values. That is deliberate:
 * the rows a user sees always add up to the total they see. Summing exact fractions and
 * rounding only at the end would produce a total that disagrees with the visible rows.
 */
export function monthlyCents(amountCents: number, intervalMonths: number): number {
  assertInterval(intervalMonths);
  if (intervalMonths === 1) {
    return amountCents;
  }
  return Math.round(amountCents / intervalMonths);
}

/** Yearly equivalent of a recurring amount, for the "36,00 € jährlich" hint in the UI. */
export function yearlyCents(amountCents: number, intervalMonths: number): number {
  assertInterval(intervalMonths);
  return Math.round((amountCents * MONTHS_PER_YEAR) / intervalMonths);
}

/** Sum of the monthly equivalents of many recurring entries. */
export function sumMonthlyCents(
  entries: ReadonlyArray<{ amountCents: number; intervalMonths: number }>,
): number {
  let total = 0;
  for (const entry of entries) {
    total += monthlyCents(entry.amountCents, entry.intervalMonths);
  }
  return total;
}

function assertInterval(intervalMonths: number): void {
  if (!Number.isInteger(intervalMonths) || intervalMonths < 1) {
    throw new RangeError(
      `intervalMonths must be a positive integer, got ${intervalMonths}`,
    );
  }
}
