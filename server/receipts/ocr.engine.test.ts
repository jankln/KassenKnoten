import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { parseReceipt } from "@/lib/domain/receipt";
import { recogniseReceipt, release } from "./ocr";

/**
 * The real engine on a real image — the one place the suite runs Tesseract.
 *
 * Everything else about receipts is tested on text, because text is what the parser
 * sees. This is about what produces that text: a phone photo is not lit evenly, and with
 * Tesseract's default global threshold the darker half of the paper — with the total on
 * it — did not survive binarisation (#12). The fixture is synthetic, so it can live in
 * the repository: a shadowed receipt with small item lines and a large bold SUMME.
 */

afterAll(async () => {
  await release();
});

describe("recogniseReceipt on a photographed receipt", () => {
  it.each(["de", "en"] as const)(
    "keeps the SUMME line of a receipt with a shadow across it (%s)",
    async (locale) => {
      const image = readFileSync("scripts/fixtures/receipt-shadow.webp");

      const { text } = await recogniseReceipt(image, locale);
      const draft = parseReceipt(text, "2026-09-14");

      expect(draft).toMatchObject({
        amountCents: 1321,
        amountSource: "total",
        bookedOn: "2026-09-01",
        label: "MUSTERMARKT",
      });
    },
    60_000,
  );
});
