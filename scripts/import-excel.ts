/**
 * Import the documented legacy workbook into a fresh KassenKnoten database.
 *
 * The command is deliberately dry-run by default:
 *   npm run import:excel -- --input Finanzplan.xlsx
 *   npm run import:excel -- --input Finanzplan.xlsx --apply
 */
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { createDb, type Db } from "../db/client.ts";
import * as schema from "../db/schema.ts";

const DEFAULT_INPUT = "Finanzplan.xlsx";
const TOTAL_LABEL =
  /^(?:summe|gesamt|gesamtbetrag|total|einnahmen|fixkosten|sparen)$/iu;
const SECTION_LABEL =
  /^(?:einnahmen|fixkosten|sparen(?:\s*&.*)?|monatsergebnis|aufteilung|einstellungen|gemeinsam|shared)$/iu;
const HEADER_LABEL =
  /^(?:person|name|bezeichnung|beschreibung|kategorie|betrag|amount|wer|topf|ziel|rate|stand|zielbetrag|fortschritt|art|typ|kind)$/iu;

export interface ImportIncome {
  memberName: string;
  label: string;
  kind: "salary" | "other";
  amountCents: number;
}

export interface ImportExpense {
  scope: "private" | "shared";
  memberName?: string;
  label: string;
  categoryName: string;
  amountCents: number;
  shares?: { memberName: string; shareBp: number }[];
}

export interface ImportSavingsPot {
  name: string;
  ownerName: string | null;
  monthlyRateCents: number;
  balanceCents: number;
  targetCents: number | null;
}

export interface LegacyImport {
  members: string[];
  incomes: ImportIncome[];
  expenses: ImportExpense[];
  savingsPots: ImportSavingsPot[];
  defaultShares: { memberName: string; shareBp: number }[];
}

export class ImportValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(
      `Excel import validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
    this.errors = errors;
    this.name = "ImportValidationError";
  }
}

type Row = string[];

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const candidate = value as {
      result?: unknown;
      text?: unknown;
      richText?: { text?: string }[];
    };
    if ("result" in candidate) return text(candidate.result);
    if (typeof candidate.text === "string") return candidate.text.trim();
    if (Array.isArray(candidate.richText))
      return candidate.richText
        .map((part) => part.text ?? "")
        .join("")
        .trim();
  }
  return String(value).trim();
}

function rowsOf(sheet: ExcelJS.Worksheet): Row[] {
  const rows: Row[] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1).map(text) : [];
    rows.push(values);
  });
  return rows;
}

function normal(value: string): string {
  return value.trim().toLocaleLowerCase("de-DE").replace(/\s+/gu, " ");
}

function findSheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) throw new ImportValidationError([`Missing required sheet "${name}".`]);
  return sheet;
}

function parseMoney(
  value: string,
  location: string,
  allowBlank = false,
): number | null {
  const raw = value.trim().replace(/[€$]/gu, "").replace(/\s+/gu, "");
  if (raw === "") {
    if (allowBlank) return null;
    throw new Error(`${location}: amount is empty`);
  }
  if (/^[-+]/u.test(raw) || raw.includes("(") || raw.includes(")")) {
    throw new Error(`${location}: amount must be non-negative`);
  }
  if (!/^\d[\d.,]*$/u.test(raw))
    throw new Error(`${location}: invalid money "${value}"`);

  const separators = [...raw.matchAll(/[.,]/gu)].map((match) => match.index ?? 0);
  let integerPart = raw;
  let centsPart = "";
  if (separators.length > 0) {
    const last = separators[separators.length - 1] ?? 0;
    const suffix = raw.slice(last + 1);
    const prefix = raw.slice(0, last);
    const groupingParts = raw.split(/[.,]/u);
    const groupingIsValid =
      groupingParts.length > 1 &&
      groupingParts.every((part, index) =>
        index === 0 ? part.length >= 1 && part.length <= 3 : part.length === 3,
      );
    const isDecimal =
      suffix.length <= 2 ||
      (separators.length === 1 && prefix.length > 3 && suffix.length === 3);
    if (isDecimal) {
      if (separators.length > 1) {
        const prefixParts = prefix.split(/[.,]/u);
        if (
          !prefixParts.every((part, index) =>
            index === 0 ? part.length >= 1 && part.length <= 3 : part.length === 3,
          )
        ) {
          throw new Error(`${location}: invalid money "${value}"`);
        }
      }
      integerPart = prefix.replace(/[.,]/gu, "");
      centsPart = suffix.padEnd(2, "0");
    } else if (groupingIsValid) {
      integerPart = raw.replace(/[.,]/gu, "");
    } else {
      throw new Error(`${location}: invalid money "${value}"`);
    }
  }
  if (!/^\d+$/u.test(integerPart) || !/^\d{0,2}$/u.test(centsPart)) {
    throw new Error(`${location}: invalid money "${value}"`);
  }
  const cents = Number(`${integerPart}${centsPart.padEnd(2, "0")}`);
  if (!Number.isSafeInteger(cents)) throw new Error(`${location}: amount is too large`);
  return cents;
}

function parseBasisPoints(value: string, location: string): number {
  const raw = value.trim().replace(/\s+/gu, "");
  const percent = raw.endsWith("%");
  const digits = percent ? raw.slice(0, -1) : raw;
  const normalized = digits.replace(",", ".");
  if (!/^\d+(?:\.\d{1,4})?$/u.test(normalized)) {
    throw new Error(`${location}: invalid percentage "${value}"`);
  }
  const [whole, fraction = ""] = normalized.split(".");
  const scale = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole ?? "0") * scale + BigInt(fraction || "0");
  const basisPoints = percent
    ? (numerator * 100n) / scale
    : numerator <= scale
      ? (numerator * 10_000n) / scale
      : numerator <= scale * 100n
        ? (numerator * 100n) / scale
        : numerator;
  if (
    basisPoints < 0n ||
    basisPoints > 10_000n ||
    (percent && (numerator * 100n) % scale !== 0n)
  ) {
    throw new Error(
      `${location}: share must be an exact ratio, percentage, or basis points`,
    );
  }
  return Number(basisPoints);
}

function sectionIndex(rows: Row[], label: RegExp, start = 0): number {
  return rows.findIndex(
    (row, index) => index >= start && row.some((cell) => label.test(normal(cell))),
  );
}

function sectionEnd(rows: Row[], start: number): number {
  for (let index = start + 1; index < rows.length; index += 1) {
    if (rows[index]?.some((cell) => SECTION_LABEL.test(normal(cell)))) return index;
  }
  return rows.length;
}

function isIgnorableRow(row: Row): boolean {
  const nonEmpty = row.filter(Boolean);
  return (
    nonEmpty.length === 0 ||
    nonEmpty.every(
      (cell) => TOTAL_LABEL.test(normal(cell)) || HEADER_LABEL.test(normal(cell)),
    )
  );
}

function amountColumn(header: Row): number {
  const index = header.findIndex((cell) =>
    /^(?:betrag|amount|rate pro monat|stand aktuell|zielbetrag)$/iu.test(normal(cell)),
  );
  return index >= 0 ? index : 2;
}

function categoryColumn(header: Row): number {
  const index = header.findIndex((cell) =>
    /^(?:kategorie|category)$/iu.test(normal(cell)),
  );
  return index >= 0 ? index : 1;
}

function labelColumn(header: Row): number {
  const index = header.findIndex((cell) =>
    /^(?:bezeichnung|beschreibung|name|topf|ziel)$/iu.test(normal(cell)),
  );
  return index >= 0 ? index : 0;
}

function memberForSection(
  title: string,
  members: string[],
  fallbackIndex: number,
): string {
  const found = members.find((member) => normal(title).includes(normal(member)));
  if (found) return found;
  const personMatch = title.match(/person\s*([ab])/iu);
  if (personMatch) {
    const index = personMatch[1]?.toLocaleLowerCase("de-DE") === "b" ? 1 : 0;
    const fallback = members[index];
    if (fallback) return fallback;
  }
  const fallback = members[fallbackIndex];
  if (fallback) return fallback;
  throw new Error(`Cannot map expense section "${title}" to a member`);
}

function parseOverview(
  sheet: ExcelJS.Worksheet,
): Pick<LegacyImport, "members" | "incomes" | "defaultShares"> {
  const rows = rowsOf(sheet);
  const errors: string[] = [];
  const incomeStart = sectionIndex(rows, /^einnahmen$/iu);
  if (incomeStart < 0)
    throw new ImportValidationError(['Sheet "Übersicht" has no Einnahmen section.']);
  const incomeEnd = sectionEnd(rows, incomeStart);
  const members: string[] = [];
  const incomes: ImportIncome[] = [];
  let header: Row = [];
  for (let index = incomeStart + 1; index < incomeEnd; index += 1) {
    const row = rows[index] ?? [];
    if (
      row.some((cell) =>
        /^(?:person|name|bezeichnung|betrag|amount|art|typ|kind)$/iu.test(normal(cell)),
      )
    ) {
      header = row;
      continue;
    }
    if (isIgnorableRow(row)) continue;
    const name = row[0] ?? "";
    if (!name || TOTAL_LABEL.test(normal(name))) continue;
    try {
      const amountIndex = header.findIndex((cell) =>
        /^(?:betrag|amount|netto)$/iu.test(normal(cell)),
      );
      const labelIndex = header.findIndex((cell) =>
        /^(?:bezeichnung|beschreibung|quelle)$/iu.test(normal(cell)),
      );
      const kindIndex = header.findIndex((cell) =>
        /^(?:art|typ|kind)$/iu.test(normal(cell)),
      );
      const amountCell =
        row[amountIndex >= 0 ? amountIndex : 1] ||
        row.slice(1).find((cell) => cell !== "");
      if (!amountCell) throw new Error("income amount is empty");
      const amountCents = parseMoney(amountCell, `Übersicht row ${index + 1}`) ?? 0;
      if (!members.some((member) => normal(member) === normal(name)))
        members.push(name);
      const kindValue = kindIndex >= 0 ? row[kindIndex] : "";
      let kind: "salary" | "other" = "salary";
      if (kindIndex >= 0) {
        if (!kindValue) throw new Error("income type is empty");
        if (/sonstig|other|bonus|neben/iu.test(normal(kindValue))) kind = "other";
        else if (!/gehalt|salary|lohn|netto/iu.test(normal(kindValue))) {
          throw new Error(`unknown income type "${kindValue}"`);
        }
      }
      incomes.push({
        memberName: name,
        label: row[labelIndex >= 0 ? labelIndex : 2] || "Einnahmen",
        kind,
        amountCents,
      });
    } catch (error) {
      errors.push(
        `Übersicht row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (members.length === 0) errors.push("Übersicht Einnahmen contains no member rows.");

  const defaultShares: { memberName: string; shareBp: number }[] = [];
  const settingsStart = sectionIndex(rows, /^einstellungen$/iu);
  if (settingsStart >= 0) {
    const end = sectionEnd(rows, settingsStart);
    for (let index = settingsStart + 1; index < end; index += 1) {
      const row = rows[index] ?? [];
      if (isIgnorableRow(row)) continue;
      const member = members.find((candidate) =>
        row.some((cell) => normal(cell).includes(normal(candidate))),
      );
      if (!member) {
        errors.push(`Übersicht row ${index + 1}: cannot map shared quota to a member.`);
        continue;
      }
      const value = row.find(
        (cell) => cell !== "" && !normal(cell).includes(normal(member)),
      );
      try {
        if (!value) throw new Error("shared quota is empty");
        defaultShares.push({
          memberName: member,
          shareBp: parseBasisPoints(value, `Übersicht row ${index + 1}`),
        });
      } catch (error) {
        errors.push(
          `Übersicht row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
  if (defaultShares.length > 0) {
    const names = new Set(defaultShares.map((share) => normal(share.memberName)));
    if (
      defaultShares.length !== members.length ||
      members.some((member) => !names.has(normal(member)))
    ) {
      errors.push("Übersicht shared quotas must contain exactly one row per member.");
    }
    if (defaultShares.reduce((sum, share) => sum + share.shareBp, 0) !== 10_000) {
      errors.push("Übersicht shared quotas must add up to 100%.");
    }
  }
  if (errors.length > 0) throw new ImportValidationError(errors);
  return { members, incomes, defaultShares };
}

function parseFixkosten(
  sheet: ExcelJS.Worksheet,
  members: string[],
  defaultShares: { memberName: string; shareBp: number }[],
): ImportExpense[] {
  const rows = rowsOf(sheet);
  const errors: string[] = [];
  const expenses: ImportExpense[] = [];
  let section: "private" | "shared" | null = null;
  let sectionMember: string | undefined;
  let header: Row = [];
  let fallbackMember = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const title = row.find(Boolean) ?? "";
    if (/gemeinsam|shared/iu.test(normal(title))) {
      section = "shared";
      sectionMember = undefined;
      header = [];
      continue;
    }
    if (/privat|private/iu.test(normal(title))) {
      section = "private";
      try {
        sectionMember = memberForSection(title, members, fallbackMember);
        fallbackMember += 1;
      } catch (error) {
        errors.push(
          `Fixkosten row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
        sectionMember = undefined;
      }
      header = [];
      continue;
    }
    if (
      row.some((cell) =>
        /^(?:bezeichnung|beschreibung|kategorie|betrag|amount)/iu.test(normal(cell)),
      )
    ) {
      header = row;
      continue;
    }
    if (!section || isIgnorableRow(row)) continue;
    const labelIndex = labelColumn(header);
    const categoryIndex = categoryColumn(header);
    const amountIndex = amountColumn(header);
    const label = row[labelIndex] ?? "";
    const categoryName = row[categoryIndex] ?? "";
    if (TOTAL_LABEL.test(normal(label))) continue;
    if (!label || !categoryName || !row[amountIndex]) {
      errors.push(`Fixkosten row ${index + 1}: expected label, category, and amount.`);
      continue;
    }
    if (section === "private" && !sectionMember) {
      errors.push(`Fixkosten row ${index + 1}: private section has no mapped member.`);
      continue;
    }
    try {
      const amountCents =
        parseMoney(row[amountIndex] ?? "", `Fixkosten row ${index + 1}`) ?? 0;
      const expense: ImportExpense = {
        scope: section,
        ...(section === "private" && sectionMember
          ? { memberName: sectionMember }
          : {}),
        label,
        categoryName,
        amountCents,
      };
      if (section === "shared") {
        const shares = defaultShares.length > 0 ? defaultShares : [];
        const shareColumns = members.map((member) => {
          const column = row.findIndex(
            (cell, cellIndex) =>
              cellIndex > amountIndex &&
              normal(header[cellIndex] ?? "").includes(normal(member)),
          );
          return column >= 0 ? { memberName: member, value: row[column] ?? "" } : null;
        });
        if (shareColumns.some((entry) => entry !== null)) {
          if (shareColumns.some((entry) => entry === null || entry.value === "")) {
            throw new Error("shared per-member columns are incomplete");
          }
          if (amountCents === 0) {
            if (defaultShares.length === 0) {
              throw new Error("zero-amount shared rows need a quota in Übersicht");
            }
            expenses.push(expense);
            continue;
          }
          expense.shares = shareColumns.map((entry) => {
            const shareCents =
              parseMoney(entry?.value ?? "", `Fixkosten row ${index + 1}`) ?? 0;
            const numerator = shareCents * 10_000;
            const shareBp = Math.floor(
              (numerator + Math.floor(amountCents / 2)) / amountCents,
            );
            return { memberName: entry?.memberName ?? "", shareBp };
          });
          if (
            expense.shares.reduce((sum, share) => sum + share.shareBp, 0) !== 10_000
          ) {
            throw new Error(
              "shared per-member amounts do not add up to the row amount",
            );
          }
        } else if (shares.length === 0) {
          throw new Error("no shared quota found in Übersicht or shared columns");
        }
      }
      expenses.push(expense);
    } catch (error) {
      errors.push(
        `Fixkosten row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (errors.length > 0) throw new ImportValidationError(errors);
  return expenses;
}

function parseSavings(sheet: ExcelJS.Worksheet, members: string[]): ImportSavingsPot[] {
  const rows = rowsOf(sheet);
  const headerIndex = rows.findIndex(
    (row) =>
      row.some((cell) => /topf|ziel/iu.test(normal(cell))) &&
      row.some((cell) => /rate/iu.test(normal(cell))),
  );
  if (headerIndex < 0)
    throw new ImportValidationError([
      'Sheet "Sparen & Rücklagen" has no savings header row.',
    ]);
  const header = rows[headerIndex] ?? [];
  const nameIndex = labelColumn(header);
  const ownerIndex = header.findIndex((cell) => /^(?:wer|owner)$/iu.test(normal(cell)));
  const rateIndex = header.findIndex((cell) => /rate/iu.test(normal(cell)));
  const balanceIndex = header.findIndex((cell) => /stand/iu.test(normal(cell)));
  const targetIndex = header.findIndex((cell) =>
    /^(?:zielbetrag|ziel)$/iu.test(normal(cell)),
  );
  if (ownerIndex < 0 || rateIndex < 0 || balanceIndex < 0 || targetIndex < 0) {
    throw new ImportValidationError([
      "Sparen & Rücklagen header must contain Topf, Wer, Rate, Stand, and Zielbetrag.",
    ]);
  }
  const pots: ImportSavingsPot[] = [];
  const errors: string[] = [];
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    if (isIgnorableRow(row)) continue;
    const name = row[nameIndex] ?? "";
    if (!name || TOTAL_LABEL.test(normal(name))) continue;
    try {
      const ownerCell = row[ownerIndex] ?? "";
      const ownerName =
        !ownerCell || /gemeinsam|haushalt|shared/iu.test(normal(ownerCell))
          ? null
          : (members.find((member) => normal(member) === normal(ownerCell)) ??
            (() => {
              throw new Error(`unknown savings owner "${ownerCell}"`);
            })());
      pots.push({
        name,
        ownerName,
        monthlyRateCents:
          parseMoney(row[rateIndex] ?? "", `Sparen row ${index + 1}`) ?? 0,
        balanceCents:
          parseMoney(row[balanceIndex] ?? "", `Sparen row ${index + 1}`) ?? 0,
        targetCents: parseMoney(
          row[targetIndex] ?? "",
          `Sparen row ${index + 1}`,
          true,
        ),
      });
    } catch (error) {
      errors.push(
        `Sparen row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (errors.length > 0) throw new ImportValidationError(errors);
  return pots;
}

export async function parseLegacyWorkbook(
  input: string | Buffer,
): Promise<LegacyImport> {
  const workbook = new ExcelJS.Workbook();
  const buffer = typeof input === "string" ? await readFile(input) : input;
  try {
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  } catch (error) {
    throw new ImportValidationError([
      `Cannot read workbook: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }
  const overview = parseOverview(findSheet(workbook, "Übersicht"));
  const expenses = parseFixkosten(
    findSheet(workbook, "Fixkosten"),
    overview.members,
    overview.defaultShares,
  );
  const savingsPots = parseSavings(
    findSheet(workbook, "Sparen & Rücklagen"),
    overview.members,
  );
  return { ...overview, expenses, savingsPots };
}

function ensureCompleteShares(importData: LegacyImport): void {
  const errors: string[] = [];
  for (const [index, expense] of importData.expenses.entries()) {
    if (expense.scope !== "shared") continue;
    const shares = expense.shares ?? importData.defaultShares;
    const names = new Set(shares.map((share) => normal(share.memberName)));
    if (
      shares.length !== importData.members.length ||
      importData.members.some((member) => !names.has(normal(member))) ||
      shares.reduce((sum, share) => sum + share.shareBp, 0) !== 10_000
    ) {
      errors.push(
        `Shared expense "${expense.label}" row ${index + 1} has no complete 100% quota.`,
      );
    }
  }
  if (errors.length > 0) throw new ImportValidationError(errors);
}

export interface ImportOptions {
  allowExisting?: boolean;
}

export interface ImportSummary {
  members: number;
  incomes: number;
  privateExpenses: number;
  sharedExpenses: number;
  savingsPots: number;
  categoriesCreated: number;
}

function databaseIsPopulated(db: Db): boolean {
  return (
    db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(eq(schema.member.active, true))
      .get() !== undefined ||
    db
      .select({ id: schema.income.id })
      .from(schema.income)
      .where(eq(schema.income.active, true))
      .get() !== undefined ||
    db
      .select({ id: schema.expense.id })
      .from(schema.expense)
      .where(eq(schema.expense.active, true))
      .get() !== undefined ||
    db
      .select({ id: schema.savingsPot.id })
      .from(schema.savingsPot)
      .where(eq(schema.savingsPot.active, true))
      .get() !== undefined
  );
}

export function importIntoDatabase(
  importData: LegacyImport,
  db: Db,
  options: ImportOptions = {},
): ImportSummary {
  ensureCompleteShares(importData);
  if (!options.allowExisting && databaseIsPopulated(db)) {
    throw new Error(
      "Refusing to import: the household already contains active data. Use --allow-existing only after a backup.",
    );
  }
  return db.transaction((tx) => {
    const memberIds = new Map<string, number>();
    for (const [index, name] of importData.members.entries()) {
      const id = tx
        .insert(schema.member)
        .values({ name, colorIndex: (index % 5) + 1, sortOrder: index })
        .returning({ id: schema.member.id })
        .get().id;
      memberIds.set(normal(name), id);
    }
    const categoryIds = new Map<string, number>();
    const categories = [
      ...new Set(importData.expenses.map((expense) => expense.categoryName)),
    ];
    let categoriesCreated = 0;
    const categoryByName = new Map(
      tx
        .select({ id: schema.category.id, name: schema.category.name })
        .from(schema.category)
        .all()
        .map((category) => [normal(category.name), category.id]),
    );
    for (const name of categories) {
      let id = categoryByName.get(normal(name));
      if (id === undefined) {
        id = tx
          .insert(schema.category)
          .values({ name, icon: "circle-dashed", isSystem: false })
          .returning({ id: schema.category.id })
          .get().id;
        categoriesCreated += 1;
        categoryByName.set(normal(name), id);
      }
      categoryIds.set(normal(name), id);
    }
    const shares = importData.defaultShares.map((share) => {
      const memberId = memberIds.get(normal(share.memberName));
      if (memberId === undefined)
        throw new Error(`Unknown quota member "${share.memberName}".`);
      return { memberId, shareBp: share.shareBp };
    });
    tx.delete(schema.defaultShare).run();
    if (shares.length > 0) tx.insert(schema.defaultShare).values(shares).run();
    for (const income of importData.incomes) {
      const memberId = memberIds.get(normal(income.memberName));
      if (memberId === undefined)
        throw new Error(`Unknown income member "${income.memberName}".`);
      tx.insert(schema.income)
        .values({
          memberId,
          label: income.label,
          kind: income.kind,
          amountCents: income.amountCents,
        })
        .run();
    }
    for (const expense of importData.expenses) {
      const categoryId = categoryIds.get(normal(expense.categoryName));
      if (categoryId === undefined)
        throw new Error(`Unknown category "${expense.categoryName}".`);
      if (expense.scope === "private") {
        const memberId = memberIds.get(normal(expense.memberName ?? ""));
        if (memberId === undefined)
          throw new Error(
            `Unknown private expense member "${expense.memberName ?? ""}".`,
          );
        tx.insert(schema.expense)
          .values({
            scope: "private",
            memberId,
            label: expense.label,
            categoryId,
            amountCents: expense.amountCents,
            intervalMonths: 1,
          })
          .run();
      } else {
        const quota = expense.shares ?? importData.defaultShares;
        const id = tx
          .insert(schema.expense)
          .values({
            scope: "shared",
            label: expense.label,
            categoryId,
            amountCents: expense.amountCents,
            intervalMonths: 1,
            splitMode: "fixed_quota",
          })
          .returning({ id: schema.expense.id })
          .get().id;
        const rows = quota.map((share) => {
          const memberId = memberIds.get(normal(share.memberName));
          if (memberId === undefined)
            throw new Error(`Unknown shared expense member "${share.memberName}".`);
          return { expenseId: id, memberId, shareBp: share.shareBp };
        });
        tx.insert(schema.expenseShare).values(rows).run();
      }
    }
    for (const pot of importData.savingsPots) {
      const ownerMemberId =
        pot.ownerName === null ? null : memberIds.get(normal(pot.ownerName));
      if (pot.ownerName !== null && ownerMemberId === undefined)
        throw new Error(`Unknown savings owner "${pot.ownerName}".`);
      tx.insert(schema.savingsPot)
        .values({
          name: pot.name,
          ownerMemberId: ownerMemberId ?? null,
          monthlyRateCents: pot.monthlyRateCents,
          balanceCents: pot.balanceCents,
          targetCents: pot.targetCents,
        })
        .run();
    }
    return {
      members: importData.members.length,
      incomes: importData.incomes.length,
      privateExpenses: importData.expenses.filter(
        (expense) => expense.scope === "private",
      ).length,
      sharedExpenses: importData.expenses.filter(
        (expense) => expense.scope === "shared",
      ).length,
      savingsPots: importData.savingsPots.length,
      categoriesCreated,
    };
  });
}

function usage(): void {
  console.error(
    "Usage: node scripts/import-excel.ts [--input Finanzplan.xlsx] [--apply] [--allow-existing]",
  );
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  let input = DEFAULT_INPUT;
  let apply = false;
  let allowExisting = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") apply = true;
    else if (argument === "--allow-existing") allowExisting = true;
    else if (argument === "--input") {
      input = argv[index + 1] ?? "";
      index += 1;
    } else {
      usage();
      throw new Error(`Unknown argument "${argument ?? ""}".`);
    }
  }
  if (!input) throw new Error("--input requires a path.");
  if (allowExisting && !apply) throw new Error("--allow-existing requires --apply.");
  const importData = await parseLegacyWorkbook(input);
  ensureCompleteShares(importData);
  const summary = {
    members: importData.members.length,
    incomes: importData.incomes.length,
    privateExpenses: importData.expenses.filter(
      (expense) => expense.scope === "private",
    ).length,
    sharedExpenses: importData.expenses.filter((expense) => expense.scope === "shared")
      .length,
    savingsPots: importData.savingsPots.length,
  };
  if (!apply) {
    console.log(
      `Dry run OK: ${summary.members} members, ${summary.incomes} incomes, ${summary.privateExpenses} private expenses, ${summary.sharedExpenses} shared expenses, ${summary.savingsPots} savings pots.`,
    );
    console.log("Nothing was written. Re-run with --apply to import.");
    return;
  }
  const handle = createDb(process.env.DATABASE_PATH ?? "./data/kassenknoten.db");
  try {
    const result = importIntoDatabase(importData, handle.db, { allowExisting });
    console.log(
      `Imported ${result.members} members, ${result.incomes} incomes, ${result.privateExpenses + result.sharedExpenses} expenses, and ${result.savingsPots} savings pots.`,
    );
  } finally {
    handle.sqlite.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
