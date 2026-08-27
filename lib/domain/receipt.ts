/**
 * Reading a till receipt.
 *
 * The input is whatever an OCR engine made of a photograph: the right words in roughly
 * the right order, with a space dropped into an amount, an `O` where a `0` belongs, and
 * the occasional line of noise. The output is a *draft* — a proposal for the booking
 * form, never a booking. Every function here is pure and takes the current date as an
 * argument, because a parser that reads the clock cannot be tested against the awkward
 * cases, and the awkward cases are the entire job.
 *
 * The one rule that governs all of it: **when in doubt, return nothing.** An empty field
 * costs the household three seconds of typing. A confidently wrong total is a receipt
 * booked at the wrong amount, and nobody re-reads a number the machine filled in.
 */

/** How the total was found. Anything other than `"total"` deserves a second look. */
export type AmountSource = "total" | "repaired" | "largest";

export interface ReceiptDraft {
  /** The total, in cents. `null` when nothing on the receipt could be one. */
  amountCents: number | null;
  amountSource: AmountSource | null;
  /** The receipt's date as `YYYY-MM-DD`, or `null` when none was plausible. */
  bookedOn: string | null;
  /** The merchant, as printed. Trimmed to the length the booking label accepts. */
  label: string | null;
}

/** The booking label column, so a suggestion never arrives too long to save. */
const LABEL_MAX = 60;

/** A receipt older than this is far likelier to be a misread than a late entry. */
const MAX_AGE_DAYS = 400;

/**
 * Words that introduce the final total.
 *
 * German and English both, always — the household picks the interface language, not the
 * language of the shop it walked into, and a bilingual list costs nothing.
 */
const TOTAL_WORDS = [
  "summe",
  "gesamt",
  "gesamtbetrag",
  "gesamtsumme",
  "endbetrag",
  "endsumme",
  "zu zahlen",
  "zahlbetrag",
  "total",
  "amount due",
  "balance due",
  "to pay",
];

/**
 * Words that mark a running or partial total.
 *
 * "Zwischensumme" contains "summe", and on a receipt with a discount it is *larger* than
 * the amount actually paid. Without this list the parser would prefer it and book the
 * price before the rebate.
 */
const PARTIAL_WORDS = ["zwischensumme", "teilsumme", "subtotal", "zwischen summe"];

/**
 * Words that mark money handed over or handed back, rather than money spent.
 *
 * These lines are the reason a naive "take the biggest number" parser fails: pay for a
 * 21,10 € shop with a fifty and the largest amount on the paper is the banknote.
 */
const PAYMENT_WORDS = [
  "geg.",
  "gegeben",
  "gegeb",
  "bar",
  "cash",
  "given",
  "rückgeld",
  "rueckgeld",
  "ruckgeld",
  "wechselgeld",
  "zurück",
  "zurueck",
  "change",
  "trinkgeld",
  "tip",
  "karte",
  "kartenzahlung",
  "girocard",
  "ec-card",
  "kreditkarte",
  "mastercard",
  "maestro",
  "visa",
  "paypal",
  "kontaktlos",
  "contactless",
  "guthaben",
  "gutschein",
];

/**
 * An amount with exactly two decimals.
 *
 * The lookarounds do the real work:
 * - `(?<![\d.,])` and the two-decimal group stop `14.03.2026` from reading as 14,03 €,
 *   which is otherwise the single most common way a date becomes a total.
 * - `(?![.,]?\d)` rejects a match that continues into more digits, so `1.234` is not
 *   1,23 € and a loyalty balance is not a price.
 * - `(?!\s*%)` rejects `19,00 %`. A VAT *rate* is bigger than the total of a small shop,
 *   so without this the fallback would happily book nineteen euros of nothing.
 *
 * The thousands group accepts a space because OCR renders `1.234,56` that way often
 * enough to matter.
 */
const AMOUNT =
  /(?<![\d.,])(\d{1,3}(?:[.\s]\d{3})*|\d+)[.,] ?(\d{2})(?![.,]?\d)(?!\s*%)/g;

const DATE_PATTERNS = [
  // 14.03.2026 · 14/03/26 · 14-03-2026
  /(?<![\d.])(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})(?![\d])/g,
  // 2026-03-14
  /(?<![\d-])(\d{4})-(\d{1,2})-(\d{1,2})(?![\d])/g,
];

function normalise(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);
}

function contains(haystack: string, words: readonly string[]): boolean {
  return words.some((word) => haystack.includes(word));
}

/** Every amount on one line, in cents, in the order they were printed. */
function amountsIn(line: string): number[] {
  const found: number[] = [];
  for (const match of line.matchAll(AMOUNT)) {
    const whole = Number(match[1]?.replace(/[.\s]/g, ""));
    const fraction = Number(match[2]);
    if (Number.isFinite(whole) && Number.isFinite(fraction)) {
      found.push(whole * 100 + fraction);
    }
  }
  return found;
}

/**
 * Put digits back where OCR read letters.
 *
 * Only ever applied to a line that already announced itself as the total and yet held no
 * readable amount — `GESAMT 2l,1O`. Running it over the whole receipt would turn the
 * shop's name into a number, so it stays where the context is unambiguous, and the
 * result is flagged as `"repaired"` so the interface can ask for a look.
 */
function repairDigits(line: string): string {
  return line.replace(/[OoQlIi|SsBb]/g, (character) => {
    switch (character) {
      case "O":
      case "o":
      case "Q":
        return "0";
      case "l":
      case "I":
      case "i":
      case "|":
        return "1";
      case "S":
      case "s":
        return "5";
      default:
        return "8";
    }
  });
}

interface Candidate {
  cents: number;
  source: AmountSource;
}

/**
 * The total, and how sure we are of it.
 *
 * Three passes, most trustworthy first: a line that names itself the total, the same
 * line with OCR's letter-for-digit slips undone, and finally the largest amount that is
 * not money changing hands. The last pass is right surprisingly often — on a receipt
 * without a total keyword the total *is* the biggest number — and it is exactly the case
 * the interface must not present as certain.
 */
function findAmount(lines: readonly string[]): Candidate | null {
  const spending = lines.filter((line) => !contains(line.toLowerCase(), PAYMENT_WORDS));

  const totalLines = spending.filter((line) => {
    const lower = line.toLowerCase();
    return contains(lower, TOTAL_WORDS) && !contains(lower, PARTIAL_WORDS);
  });

  // Last, not first: every layout prints the figure actually owed at the end of the
  // block. An earlier "Gesamt" is a heading, a category or a corrected line.
  for (let index = totalLines.length - 1; index >= 0; index -= 1) {
    const line = totalLines[index];
    if (line === undefined) {
      continue;
    }
    const amounts = amountsIn(line);
    // The rightmost amount on the line: receipts set the label left and the money right,
    // so a line like "SUMME 3 Artikel 21,10" ends with the one that matters.
    const last = amounts.at(-1);
    if (last !== undefined) {
      return { cents: last, source: "total" };
    }
  }

  for (let index = totalLines.length - 1; index >= 0; index -= 1) {
    const line = totalLines[index];
    if (line === undefined) {
      continue;
    }
    const repaired = amountsIn(repairDigits(line)).at(-1);
    if (repaired !== undefined) {
      return { cents: repaired, source: "repaired" };
    }
  }

  const all = spending.flatMap((line) => amountsIn(line));
  const largest = all.length > 0 ? Math.max(...all) : undefined;
  return largest === undefined ? null : { cents: largest, source: "largest" };
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1;
}

function toIso(year: number, month: number, day: number): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

function daysBetween(from: string, to: string): number {
  const parse = (iso: string) => {
    const [year, month, day] = iso.split("-").map(Number);
    const date = new Date(0);
    date.setHours(12, 0, 0, 0);
    date.setFullYear(year ?? 0, (month ?? 1) - 1, day ?? 1);
    return date.getTime();
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

/**
 * Turn a two-digit year into the one the receipt meant.
 *
 * `26` is 2026 in 2026 and 2026 again in early 2027. Anything the century guess pushes
 * into the future belongs to the century before it — which is also, conveniently, how a
 * best-before date printed as `28` stops being mistaken for a purchase.
 */
function expandYear(shortYear: number, today: string): number {
  const currentYear = Number(today.slice(0, 4));
  const century = Math.floor(currentYear / 100) * 100;
  const guess = century + shortYear;
  return guess > currentYear ? guess - 100 : guess;
}

/**
 * The purchase date.
 *
 * Read in the order it was printed and the first plausible one wins. Plausible means a
 * real calendar date, not in the future and not more than `MAX_AGE_DAYS` old — which is
 * what keeps a best-before date, a card's expiry and a garbled year out of the field,
 * without ever rejecting a receipt found in a coat pocket in spring.
 */
function findDate(lines: readonly string[], today: string): string | null {
  for (const line of lines) {
    for (const [index, pattern] of DATE_PATTERNS.entries()) {
      for (const match of line.matchAll(pattern)) {
        const [, one = "", two = "", three = ""] = match;
        const isIso = index === 1;

        // Day-first everywhere but the ISO pattern. There is no locale in which a till
        // receipt prints month-first with dots, and guessing between 03.04. and 04.03.
        // from the numbers alone is not possible anyway.
        const day = Number(isIso ? three : one);
        const month = Number(two);
        const year = isIso
          ? Number(one)
          : three.length === 2
            ? expandYear(Number(three), today)
            : Number(three);

        if (!isRealDate(year, month, day)) {
          continue;
        }
        const iso = toIso(year, month, day);
        const age = daysBetween(iso, today);
        if (age >= 0 && age <= MAX_AGE_DAYS) {
          return iso;
        }
      }
    }
  }
  return null;
}

/**
 * The merchant, taken from the top of the receipt.
 *
 * The first line with real words on it is the shop's name in every layout worth
 * supporting. It is returned as printed — shouted capitals included — because tidying it
 * would be the parser inventing a name the paper does not carry.
 */
function findLabel(lines: readonly string[]): string | null {
  for (const line of lines.slice(0, 6)) {
    const letters = line.replace(/[^\p{L}]/gu, "");
    if (letters.length < 3) {
      continue;
    }
    // A slogan or an address is not a name, but a line that is mostly digits certainly
    // is not either — that is a till number, a VAT id or a postcode.
    if (letters.length < line.length / 2) {
      continue;
    }
    return line.slice(0, LABEL_MAX).trim();
  }
  return null;
}

/**
 * Read OCR text into a draft booking.
 *
 * `today` is `YYYY-MM-DD` and is supplied by the caller, never read from the clock.
 */
export function parseReceipt(text: string, today: string): ReceiptDraft {
  const lines = normalise(text);
  const amount = findAmount(lines);
  return {
    amountCents: amount?.cents ?? null,
    amountSource: amount?.source ?? null,
    bookedOn: findDate(lines, today),
    label: findLabel(lines),
  };
}
