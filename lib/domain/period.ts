/**
 * Months, as the app counts them.
 *
 * A period is a calendar month written `YYYY-MM`. That is the whole time vocabulary of
 * this application: incomes and fixed costs are valid for a range of months, the
 * dashboard shows one month, and history is a list of them. Days never enter the model,
 * because nothing here is billed by the day.
 *
 * Everything in this module is pure and total: no clock, no timezone surprises, no
 * `Date` unless the caller hands one over.
 */

/** A calendar month, `YYYY-MM`. */
export type Period = string;

const PATTERN = /^(\d{4})-(\d{2})$/;

interface Parts {
  year: number;
  month: number;
}

function parse(period: Period): Parts {
  const match = PATTERN.exec(period);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  if (!match || year < 1 || month < 1 || month > 12) {
    throw new Error(`Invalid period: ${period}`);
  }
  return { year, month };
}

function format({ year, month }: Parts): Period {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

export function isPeriod(value: unknown): value is Period {
  if (typeof value !== "string") {
    return false;
  }
  try {
    parse(value);
    return true;
  } catch {
    return false;
  }
}

/** The period a date falls into, in the local timezone. */
export function periodFromDate(date: Date): Period {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Cannot create a period from an invalid date.");
  }
  return format({ year: date.getFullYear(), month: date.getMonth() + 1 });
}

/** The first day of a period, midnight local time. */
export function dateFromPeriod(period: Period): Date {
  const { year, month } = parse(period);
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, 1);
  return date;
}

/**
 * Move a period by whole months, forwards or backwards.
 *
 * Done in month arithmetic rather than by adding days to a `Date`, so it cannot be
 * bent by a 28-day February or a daylight-saving boundary.
 */
export function addMonths(period: Period, count: number): Period {
  const { year, month } = parse(period);
  const index = year * 12 + (month - 1) + count;
  // Year 0 is not a period this module accepts, so the lowest legal index is that of
  // 0001-01. Guarding against a negative index would let 0000-12 through, and the
  // result would be a string that `parse` rejects — an invalid value produced by a
  // function that is supposed to be total.
  if (index < 12) {
    throw new Error(`Period out of range: ${period} ${count >= 0 ? "+" : ""}${count}`);
  }
  return format({ year: Math.floor(index / 12), month: (index % 12) + 1 });
}

export function previousPeriod(period: Period): Period {
  return addMonths(period, -1);
}

export function nextPeriod(period: Period): Period {
  return addMonths(period, 1);
}

/** Negative, zero or positive, like every other comparator. */
export function comparePeriods(a: Period, b: Period): number {
  const left = parse(a);
  const right = parse(b);
  return left.year - right.year || left.month - right.month;
}

/** How many months lie between two periods; negative when `to` is earlier. */
export function monthsBetween(from: Period, to: Period): number {
  const start = parse(from);
  const end = parse(to);
  return (end.year - start.year) * 12 + (end.month - start.month);
}

/** Every period from `from` to `to` inclusive; empty when `to` is earlier. */
export function periodRange(from: Period, to: Period): Period[] {
  const span = monthsBetween(from, to);
  if (span < 0) {
    return [];
  }
  return Array.from({ length: span + 1 }, (_, index) => addMonths(from, index));
}

/**
 * Whether an entry valid from `validFrom` until `validUntil` applies in `period`.
 *
 * `validUntil` is inclusive — "gültig bis März" means March still counts — and `null`
 * means open-ended, which is the ordinary case for a salary or a rent that has no
 * planned end.
 */
export function coversPeriod(
  period: Period,
  validFrom: Period,
  validUntil: Period | null,
): boolean {
  if (comparePeriods(period, validFrom) < 0) {
    return false;
  }
  return validUntil === null || comparePeriods(period, validUntil) <= 0;
}

/** A validity range is sound when it does not end before it starts. */
export function isValidRange(validFrom: Period, validUntil: Period | null): boolean {
  if (!isPeriod(validFrom) || (validUntil !== null && !isPeriod(validUntil))) {
    return false;
  }
  return validUntil === null || comparePeriods(validFrom, validUntil) <= 0;
}
