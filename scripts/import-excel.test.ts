import ExcelJS from "exceljs";
import { afterEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  importIntoDatabase,
  parseLegacyWorkbook,
  type LegacyImport,
} from "./import-excel";

let handle: ReturnType<typeof createDb> | undefined;

afterEach(() => {
  handle?.sqlite.close();
  handle = undefined;
});

async function workbookBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const overview = workbook.addWorksheet("Übersicht");
  overview.addRow(["Einnahmen"]);
  overview.addRow(["Person", "Betrag", "Bezeichnung", "Art"]);
  overview.addRow(["Alex", "2.050,00 €", "Gehalt", "Gehalt"]);
  overview.addRow(["Robin", "2,310.00", "Gehalt", "Gehalt"]);
  overview.addRow(["Alex", "100,00", "Nebenjob", "Sonstiges"]);
  overview.addRow(["Summe", "4.360,00 €"]);
  overview.addRow(["Einstellungen"]);
  overview.addRow(["Alex", "50%"]);
  overview.addRow(["Robin", "0,5"]);

  const expenses = workbook.addWorksheet("Fixkosten");
  expenses.addRow(["Alex · privat"]);
  expenses.addRow(["Bezeichnung", "Kategorie", "Betrag"]);
  expenses.addRow(["Miete", "Wohnen", "900,00"]);
  expenses.addRow(["Robin · privat"]);
  expenses.addRow(["Bezeichnung", "Kategorie", "Betrag"]);
  expenses.addRow(["Sportverein", "Sport", "45,00"]);
  expenses.addRow(["Gemeinsam"]);
  expenses.addRow(["Bezeichnung", "Kategorie", "Betrag", "Alex", "Robin"]);
  expenses.addRow(["Internet", "Software", "39,99", "19,99", "20,00"]);

  const savings = workbook.addWorksheet("Sparen & Rücklagen");
  savings.addRow([
    "Topf / Ziel",
    "Wer",
    "Rate pro Monat",
    "Stand aktuell",
    "Zielbetrag",
  ]);
  savings.addRow(["Notgroschen", "Alex", "100,00", "1.234,56", "5.000,00"]);
  savings.addRow(["Urlaub", "Gemeinsam", "50,00", "200,00", ""]);

  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

describe("Excel import", () => {
  it("parses the documented sheets and German money formats without floats", async () => {
    const result = await parseLegacyWorkbook(await workbookBuffer());

    expect(result.members).toEqual(["Alex", "Robin"]);
    expect(result.incomes.map((income) => income.amountCents)).toEqual([
      205_000, 231_000, 10_000,
    ]);
    expect(result.incomes[2]?.kind).toBe("other");
    expect(result.expenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "private",
          memberName: "Alex",
          amountCents: 90_000,
        }),
        expect.objectContaining({
          scope: "shared",
          amountCents: 3_999,
          shares: [
            { memberName: "Alex", shareBp: 4999 },
            { memberName: "Robin", shareBp: 5001 },
          ],
        }),
      ]),
    );
    expect(result.savingsPots).toEqual([
      {
        name: "Notgroschen",
        ownerName: "Alex",
        monthlyRateCents: 10_000,
        balanceCents: 123_456,
        targetCents: 500_000,
      },
      {
        name: "Urlaub",
        ownerName: null,
        monthlyRateCents: 5_000,
        balanceCents: 20_000,
        targetCents: null,
      },
    ]);
  });

  it("writes everything in one transaction and refuses populated households", async () => {
    const importData: LegacyImport = await parseLegacyWorkbook(await workbookBuffer());
    handle = createDb(":memory:");

    const summary = importIntoDatabase(importData, handle.db);
    expect(summary).toMatchObject({
      members: 2,
      incomes: 3,
      privateExpenses: 2,
      sharedExpenses: 1,
      savingsPots: 2,
    });
    expect(
      handle.db
        .select()
        .from(schema.member)
        .all()
        .map((row) => row.name),
    ).toEqual(["Alex", "Robin"]);
    expect(handle.db.select().from(schema.expenseShare).all()).toHaveLength(2);
    expect(() =>
      importIntoDatabase(importData, handle?.db ?? createDb(":memory:").db),
    ).toThrow(/already contains active data/u);
  });

  it("does not accept an incomplete shared quota", async () => {
    const importData = await parseLegacyWorkbook(await workbookBuffer());
    importData.defaultShares = [{ memberName: "Alex", shareBp: 10_000 }];
    for (const expense of importData.expenses) {
      if (expense.scope === "shared") delete expense.shares;
    }
    expect(() => {
      handle = createDb(":memory:");
      importIntoDatabase(importData, handle.db);
    }).toThrow(/complete 100% quota/u);
  });

  it("rolls back when a later row cannot be mapped", async () => {
    const importData = await parseLegacyWorkbook(await workbookBuffer());
    importData.savingsPots[0]!.ownerName = "Unknown";
    handle = createDb(":memory:");

    expect(() => importIntoDatabase(importData, handle!.db)).toThrow(
      /Unknown savings owner/u,
    );
    expect(handle.db.select().from(schema.member).all()).toEqual([]);
    expect(handle.db.select().from(schema.income).all()).toEqual([]);
  });
});
