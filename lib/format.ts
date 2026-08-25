import type { Messages } from "./i18n";

/**
 * Formatting and parsing for everything the household reads and types.
 *
 * All amounts crossing this boundary are integer cents. Formatting is the only place
 * where money becomes a string, and parsing is the only place where a typed string
 * becomes money — nothing in between ever holds a float.
 */

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const currencyNoFraction = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const monthAndYear = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  year: "numeric",
});

const dayAndMonth = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
});

/** `123456` → `"1.234,56 €"`. */
export function formatCents(cents: number): string {
  return currency.format(cents / 100);
}

/**
 * `123456` → `"1.235 €"`. For headline figures where the cents are noise; never for a
 * row that has to add up to a total shown elsewhere.
 */
export function formatCentsRounded(cents: number): string {
  return currencyNoFraction.format(cents / 100);
}

/** `123456` → `"1.234,56"`, without the currency symbol — for input fields. */
export function formatAmountForInput(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse what someone types into an amount field. Returns `null` for anything that is not
 * a usable number, so the caller can show a message rather than silently reading a zero.
 *
 * German-first: `.` groups thousands, `,` is the decimal separator. `1.234` is one
 * thousand two hundred thirty-four euros, never one euro twenty-three.
 *
 * The one concession: a single `.` followed by exactly one or two digits at the end is
 * read as a decimal point, because on a numeric keypad that is unambiguously what the
 * person meant.
 */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim().replace(/\s|€/g, "");
  if (trimmed === "") {
    return null;
  }

  const negative = trimmed.startsWith("-");
  const digitsOnly = negative ? trimmed.slice(1) : trimmed;

  if (!/^[\d.,]+$/.test(digitsOnly)) {
    return null;
  }

  let normalised: string;
  if (digitsOnly.includes(",")) {
    // Comma decides: everything before it is grouping.
    normalised = digitsOnly.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+\.\d{1,2}$/.test(digitsOnly)) {
    // A lone dot with one or two trailing digits: a keypad decimal point.
    normalised = digitsOnly;
  } else {
    normalised = digitsOnly.replace(/\./g, "");
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalised);
  const whole = match?.[1];
  if (!whole || whole.length > 12) {
    return null;
  }

  // Built from integer parts on purpose. `Number.parseFloat("1.005") * 100` is
  // 100.49999999999999, so the obvious implementation loses a cent — in a codebase whose
  // first rule is that no float ever touches money.
  const fraction = match[2] ?? "";
  const centsPart = fraction.slice(0, 2).padEnd(2, "0");
  let cents = Number.parseInt(whole, 10) * 100 + Number.parseInt(centsPart, 10);

  const nextDigit = fraction[2];
  if (nextDigit !== undefined && Number(nextDigit) >= 5) {
    cents += 1;
  }

  return negative ? -cents : cents;
}

/** `5000` → `"50 %"`, `3674` → `"36,7 %"`. */
export function formatShareBp(shareBp: number): string {
  // Round first, then decide: 47,02 % is shown as "47 %", not "47,0 %".
  const percent = Math.round(shareBp / 10) / 10;
  const decimals = Number.isInteger(percent) ? 0 : 1;
  return `${percent.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} %`;
}

/** `0.7` → `"70 %"`. For progress towards a savings target. */
export function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100).toLocaleString("de-DE")} %`;
}

/**
 * `1` → "monthly", `12` → "yearly", `4` → "every 4 months".
 *
 * Takes the messages rather than reaching for a language of its own: this is the one
 * formatting helper whose output is words instead of digits, and words have a language.
 */
export function formatInterval(months: number, t: Messages): string {
  const known = t.intervals[months as 1 | 3 | 6 | 12];
  return known ?? t.intervals.other(months);
}

/** `"2026-08"` → `"August 2026"`. */
export function formatPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) {
    return period;
  }
  return monthAndYear.format(new Date(Date.UTC(year, month - 1, 1)));
}

/**
 * `"2026-08-03"` → `"03.08."`. For a list of receipts inside one month, where the year
 * is already established by the screen and repeating it in every row is noise.
 *
 * Parsed as UTC so a date near midnight cannot slide into the previous day in a timezone
 * behind it; these are calendar days, not moments.
 */
export function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  // de-DE already renders "03.08." with its trailing dot; adding one gives "03.08..".
  return dayAndMonth.format(new Date(Date.UTC(year, month - 1, day)));
}

/** The period key for a date, e.g. `"2026-08"`. */
export function toPeriod(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
