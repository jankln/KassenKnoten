import { describe, expect, it } from "vitest";
import {
  formatAmountForInput,
  formatCents,
  formatCentsRounded,
  formatInterval,
  formatDay,
  formatPeriod,
  formatRatio,
  formatShareBp,
  parseAmountToCents,
  toPeriod,
} from "./format";
import { de } from "./i18n/de";
import { en } from "./i18n/en";

/** Intl uses a narrow no-break space before the currency symbol. */
function normalise(value: string): string {
  return value.replace(/ | /g, " ");
}

describe("formatCents", () => {
  it("formats German currency", () => {
    expect(normalise(formatCents(123_456))).toBe("1.234,56 €");
    expect(normalise(formatCents(0))).toBe("0,00 €");
    expect(normalise(formatCents(5))).toBe("0,05 €");
  });

  it("keeps the sign on negative amounts", () => {
    expect(normalise(formatCents(-2000))).toBe("-20,00 €");
  });

  it("rounds only where cents are noise", () => {
    expect(normalise(formatCentsRounded(123_456))).toBe("1.235 €");
  });

  it("formats without a symbol for input fields", () => {
    expect(formatAmountForInput(123_456)).toBe("1.234,56");
  });
});

describe("parseAmountToCents", () => {
  it("reads a plain German amount", () => {
    expect(parseAmountToCents("1234,56")).toBe(123_456);
    expect(parseAmountToCents("0,05")).toBe(5);
    expect(parseAmountToCents("980")).toBe(98_000);
  });

  it("treats a dot as a thousands separator, as German does", () => {
    expect(parseAmountToCents("1.234,56")).toBe(123_456);
    expect(parseAmountToCents("1.234")).toBe(123_400);
    expect(parseAmountToCents("1.234.567,89")).toBe(123_456_789);
  });

  it("still accepts a keypad decimal point", () => {
    expect(parseAmountToCents("12.50")).toBe(1250);
    expect(parseAmountToCents("12.5")).toBe(1250);
  });

  it("ignores spaces and a typed euro sign", () => {
    expect(parseAmountToCents(" 1.234,56 € ")).toBe(123_456);
  });

  it("keeps negatives", () => {
    expect(parseAmountToCents("-20,00")).toBe(-2000);
  });

  it("rounds to the nearest cent rather than truncating", () => {
    expect(parseAmountToCents("1,005")).toBe(101);
    expect(parseAmountToCents("1,004")).toBe(100);
  });

  it("returns null for anything unusable, instead of a silent zero", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("   ")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("12,34,56")).toBeNull();
    expect(parseAmountToCents("-")).toBeNull();
  });
});

describe("formatShareBp", () => {
  it("drops the decimals on a whole percentage", () => {
    expect(formatShareBp(5000)).toBe("50 %");
    expect(formatShareBp(10_000)).toBe("100 %");
  });

  it("keeps one decimal when the share is not whole", () => {
    expect(formatShareBp(4702)).toBe("47 %");
    expect(formatShareBp(3674)).toBe("36,7 %");
  });
});

describe("formatRatio", () => {
  it("renders progress as a percentage", () => {
    expect(formatRatio(0.7)).toBe("70 %");
    expect(formatRatio(1.2)).toBe("120 %");
  });
});

describe("formatInterval", () => {
  it("names the intervals people actually use, in each language", () => {
    expect(formatInterval(1, en)).toBe("monthly");
    expect(formatInterval(12, en)).toBe("yearly");
    expect(formatInterval(1, de)).toBe("monatlich");
    expect(formatInterval(3, de)).toBe("vierteljährlich");
    expect(formatInterval(6, de)).toBe("halbjährlich");
    expect(formatInterval(12, de)).toBe("jährlich");
  });

  it("falls back to a readable phrase for anything else", () => {
    expect(formatInterval(4, en)).toBe("every 4 months");
    expect(formatInterval(4, de)).toBe("alle 4 Monate");
    expect(formatInterval(24, de)).toBe("alle 24 Monate");
  });
});

describe("periods", () => {
  it("renders a period as a German month", () => {
    expect(formatPeriod("2026-08")).toBe("August 2026");
    expect(formatPeriod("2026-01")).toBe("Januar 2026");
  });

  it("returns the raw value rather than a wrong date for nonsense", () => {
    expect(formatPeriod("kaputt")).toBe("kaputt");
  });

  it("derives the period key from a date", () => {
    expect(toPeriod(new Date(2026, 7, 21))).toBe("2026-08");
    expect(toPeriod(new Date(2026, 0, 1))).toBe("2026-01");
  });
});

describe("formatDay", () => {
  it("shows the day and month of a receipt, without the year", () => {
    expect(formatDay("2026-08-03")).toBe("03.08.");
    expect(formatDay("2026-12-31")).toBe("31.12.");
  });

  it("hands back anything it cannot read rather than inventing a date", () => {
    expect(formatDay("nicht ein datum")).toBe("nicht ein datum");
  });
});
