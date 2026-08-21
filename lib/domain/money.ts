/**
 * Cent arithmetic.
 *
 * Every amount in KassenKnoten is an integer number of cents. Floating point money is
 * the classic way to make a household budget disagree with itself by a cent per row, so
 * it does not exist in this codebase.
 */

/** Basis points: 10000 bp = 100 %. */
export const FULL_SHARE_BP = 10_000;

export function sumCents(values: Iterable<number>): number {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
}

/**
 * Distribute `total` across `weights` so that the parts sum back to exactly `total`.
 *
 * Uses the largest-remainder method: every part gets its floored exact share, and the
 * cents left over go to the parts with the largest fractional remainder (ties resolved
 * by original position, so the result is deterministic).
 *
 * Naive rounding fails here: 100 cents at 1/3 each rounds to 33+33+33 = 99, quietly
 * losing a cent. This returns 34+33+33.
 *
 * Degenerate inputs are defined rather than fatal:
 * - no weights at all → empty result
 * - all weights zero → distributed equally
 * - negative totals are supported (the leftover is handed out the same way)
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  assertInteger(total, "total");

  if (weights.length === 0) {
    return [];
  }
  if (weights.some((weight) => weight < 0)) {
    throw new RangeError("allocate: weights must not be negative");
  }

  const weightSum = sumCents(weights);
  const effective = weightSum === 0 ? weights.map(() => 1) : weights;
  const effectiveSum = weightSum === 0 ? weights.length : weightSum;

  const exact = effective.map((weight) => (total * weight) / effectiveSum);
  const floored = exact.map((value) => Math.floor(value));
  let remaining = total - sumCents(floored);

  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  const result = [...floored];
  for (let i = 0; remaining > 0; i += 1, remaining -= 1) {
    const target = order[i % order.length];
    if (target) {
      result[target.index] = (result[target.index] ?? 0) + 1;
    }
  }

  return result;
}

/** Percentage of `part` in `total`, in basis points. Returns 0 for a zero total. */
export function ratioToBp(part: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((part / total) * FULL_SHARE_BP);
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer number of cents, got ${value}`);
  }
}
