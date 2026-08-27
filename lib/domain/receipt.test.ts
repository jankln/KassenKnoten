import { describe, expect, it } from "vitest";
import { parseReceipt } from "./receipt";

/**
 * The reference case is genuine Tesseract output, captured from a photographed receipt
 * and pasted in unedited — including the space it dropped into "50, 00". Hand-written
 * fixtures are too tidy to be a regression net for an OCR parser.
 */
const SCANNED = `Hofladen Waldeck

Bahnhofstr. 12

12345 Musterstadt

Vollmilch 3,5% 1,19 A
Bio Eier 10er 3,49 A
Kaffee 500g 7,99 A
Spuelmittel 2,15 B
Tomaten 1kg 2,99 A
Brot Landbrot 3,29 A
SUMME EUR 21,10
Geg. BAR 50, 00
Rueckgeld 28,90

MwSt A 7,0% Netto 15,84
14.03.2026 17:42 Bon-Nr. 4471
Vielen Dank fuer Ihren Einkauf`;

const TODAY = "2026-03-27";

describe("parseReceipt", () => {
  it("reads a real scan", () => {
    expect(parseReceipt(SCANNED, TODAY)).toEqual({
      amountCents: 2110,
      amountSource: "total",
      bookedOn: "2026-03-14",
      label: "Hofladen Waldeck",
    });
  });

  describe("the total", () => {
    it("prefers the line that names itself over the largest number", () => {
      // The banknote is more than twice the shop. This is the failure that makes a
      // "biggest number wins" parser useless in practice.
      const draft = parseReceipt(SCANNED, TODAY);
      expect(draft.amountCents).toBe(2110);
    });

    it("ignores money handed over and handed back", () => {
      const text = [
        "Kiosk Nordring",
        "Zeitung 3,40",
        "BAR 20,00",
        "Rückgeld 16,60",
      ].join("\n");
      expect(parseReceipt(text, TODAY)).toMatchObject({
        amountCents: 340,
        amountSource: "largest",
      });
    });

    it("takes the final total, not the one before the discount", () => {
      const text = [
        "Krämer & Sohn",
        "Zwischensumme 25,00",
        "Rabatt -3,90",
        "SUMME 21,10",
      ].join("\n");
      expect(parseReceipt(text, TODAY)).toMatchObject({
        amountCents: 2110,
        amountSource: "total",
      });
    });

    it("takes the rightmost amount when the total line carries several", () => {
      expect(parseReceipt("GESAMT 3 Artikel 21,10", TODAY)).toMatchObject({
        amountCents: 2110,
        amountSource: "total",
      });
    });

    it("never reads a VAT rate as an amount", () => {
      // 19,00 % is larger than this whole receipt, so a rate mistaken for money would
      // more than double it.
      const text = ["Bäckerei Süd", "Brötchen 4,20", "enthält 19,00 % MwSt"].join("\n");
      expect(parseReceipt(text, TODAY)).toMatchObject({
        amountCents: 420,
        amountSource: "largest",
      });
    });

    it("never reads a date as an amount", () => {
      expect(parseReceipt("Bon vom 14.03.2026", TODAY).amountCents).toBeNull();
    });

    it("never reads a longer number as an amount", () => {
      // A loyalty balance printed as 1.234 is not 1,23 €.
      expect(parseReceipt("Punktestand 1.234", TODAY).amountCents).toBeNull();
    });

    it("understands a thousands separator", () => {
      expect(parseReceipt("Summe 1.234,56", TODAY).amountCents).toBe(123_456);
    });

    it("understands a decimal point as well as a comma", () => {
      expect(parseReceipt("TOTAL 21.10", TODAY).amountCents).toBe(2110);
    });

    it("puts digits back where OCR read letters, and says that it did", () => {
      expect(parseReceipt("GESAMT 2l,1O", TODAY)).toMatchObject({
        amountCents: 2110,
        amountSource: "repaired",
      });
    });

    it("falls back to the largest amount when nothing names itself", () => {
      const text = ["Tankstelle Ost", "Super E10 45,80", "Kaffee 2,30"].join("\n");
      expect(parseReceipt(text, TODAY)).toMatchObject({
        amountCents: 4580,
        amountSource: "largest",
      });
    });

    it("returns nothing rather than a guess when there is no amount at all", () => {
      expect(parseReceipt("Hofladen Waldeck\nVielen Dank", TODAY)).toMatchObject({
        amountCents: null,
        amountSource: null,
      });
    });

    it("survives an empty scan", () => {
      expect(parseReceipt("", TODAY)).toEqual({
        amountCents: null,
        amountSource: null,
        bookedOn: null,
        label: null,
      });
    });
  });

  describe("the date", () => {
    it("expands a two-digit year", () => {
      expect(parseReceipt("Einkauf 14.03.26", TODAY).bookedOn).toBe("2026-03-14");
    });

    it("reads an ISO date", () => {
      expect(parseReceipt("Datum 2026-03-14", TODAY).bookedOn).toBe("2026-03-14");
    });

    it("reads slashes and hyphens", () => {
      expect(parseReceipt("14/03/2026", TODAY).bookedOn).toBe("2026-03-14");
      expect(parseReceipt("14-03-2026", TODAY).bookedOn).toBe("2026-03-14");
    });

    it("skips a best-before date and keeps looking", () => {
      // The milk is good until August; the receipt is from March.
      const text = ["Frischmilch MHD 12.08.2026", "Bon 14.03.2026 17:42"].join("\n");
      expect(parseReceipt(text, TODAY).bookedOn).toBe("2026-03-14");
    });

    it("refuses a date in the future", () => {
      expect(parseReceipt("Gültig bis 01.01.2027", TODAY).bookedOn).toBeNull();
    });

    it("refuses a date too old to be this receipt", () => {
      expect(parseReceipt("31.12.2019", TODAY).bookedOn).toBeNull();
    });

    it("refuses a day that does not exist", () => {
      expect(parseReceipt("30.02.2026", TODAY).bookedOn).toBeNull();
    });

    it("accepts the 29th of a leap February", () => {
      expect(parseReceipt("29.02.2024", "2024-03-05").bookedOn).toBe("2024-02-29");
    });

    it("accepts today", () => {
      expect(parseReceipt("27.03.2026", TODAY).bookedOn).toBe("2026-03-27");
    });

    it("does not read a time as a date", () => {
      expect(parseReceipt("Kasse 3 17:42:11", TODAY).bookedOn).toBeNull();
    });
  });

  describe("the merchant", () => {
    it("takes the first line that reads like a name", () => {
      expect(parseReceipt(SCANNED, TODAY).label).toBe("Hofladen Waldeck");
    });

    it("skips a line that is mostly digits", () => {
      const text = ["12345 6789 0000", "Hofladen Waldeck", "Summe 4,20"].join("\n");
      expect(parseReceipt(text, TODAY).label).toBe("Hofladen Waldeck");
    });

    it("skips noise the scanner picked up off the table", () => {
      expect(parseReceipt("*~*\n-\nKiosk Nordring", TODAY).label).toBe(
        "Kiosk Nordring",
      );
    });

    it("trims a name too long for the booking label", () => {
      const long = `${"Handelsgesellschaft ".repeat(6)}`;
      const label = parseReceipt(long, TODAY).label;
      expect(label).not.toBeNull();
      expect(label!.length).toBeLessThanOrEqual(60);
    });

    it("gives up rather than returning a fragment", () => {
      expect(parseReceipt("4,20\n1,10", TODAY).label).toBeNull();
    });
  });
});
