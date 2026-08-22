import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { monthlyCents } from "@/lib/domain/interval";
import { isPeriod, periodFromDate } from "@/lib/domain/period";
import { de } from "@/lib/i18n/de";

export const BACKUP_FORMAT = "kassenknoten-backup";
/**
 * Version 2 added `validFrom` / `validUntil` to incomes and expenses. Version 1 files are
 * still accepted: their entries never had an end and are backfilled to the month the
 * household in that same file was created, which is the earliest month it can describe.
 */
export const BACKUP_VERSION = 2;

export class RestoreValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestoreValidationError";
  }
}

const integer = z.number().int();
const nonNegativeInteger = integer.nonnegative();
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "must be an ISO date")
  .refine((value) => !Number.isNaN(Date.parse(value)), "must be an ISO date");
const splitMode = z.enum(["fixed_quota", "income_ratio"]);
const incomeKind = z.enum(["salary", "other"]);
const scope = z.enum(["private", "shared"]);

const timestamped = {
  createdAt: dateString,
  updatedAt: dateString,
};

const householdSchema = z
  .object({
    id: z.literal(1),
    name: z.string().min(1),
    currency: z.string().min(1),
    defaultSplitMode: splitMode,
    onboardingDone: z.boolean(),
    ...timestamped,
  })
  .strict();

const memberSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    colorIndex: z.number().int().min(1).max(5),
    sortOrder: integer,
    active: z.boolean(),
    ...timestamped,
  })
  .strict();

/** Absent in a version 1 file, present in every version 2 one. */
const optionalValidity = {
  validFrom: z.string().refine(isPeriod).optional(),
  validUntil: z.string().refine(isPeriod).nullable().optional(),
};

const incomeSchema = z
  .object({
    id: z.number().int().positive(),
    memberId: z.number().int().positive(),
    label: z.string().min(1),
    kind: incomeKind,
    amountCents: nonNegativeInteger,
    intervalMonths: z.number().int().positive(),
    active: z.boolean(),
    ...optionalValidity,
    ...timestamped,
  })
  .strict();

const categorySchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    icon: z.string().min(1),
    sortOrder: integer,
    isSystem: z.boolean(),
    ...timestamped,
  })
  .strict();

const expenseSchema = z
  .object({
    id: z.number().int().positive(),
    scope,
    memberId: z.number().int().positive().nullable(),
    label: z.string().min(1),
    categoryId: z.number().int().positive().nullable(),
    amountCents: nonNegativeInteger,
    intervalMonths: z.number().int().positive(),
    dueMonth: z.number().int().min(1).max(12).nullable(),
    splitMode: splitMode.nullable(),
    note: z.string().nullable(),
    sortOrder: integer,
    active: z.boolean(),
    ...optionalValidity,
    ...timestamped,
  })
  .strict();

const expenseShareSchema = z
  .object({
    expenseId: z.number().int().positive(),
    memberId: z.number().int().positive(),
    shareBp: z.number().int().min(0).max(10_000),
  })
  .strict();

const defaultShareSchema = z
  .object({
    memberId: z.number().int().positive(),
    shareBp: z.number().int().min(0).max(10_000),
  })
  .strict();

const savingsPotSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    ownerMemberId: z.number().int().positive().nullable(),
    monthlyRateCents: nonNegativeInteger,
    balanceCents: nonNegativeInteger,
    targetCents: z.number().int().positive().nullable(),
    note: z.string().nullable(),
    sortOrder: integer,
    active: z.boolean(),
    ...timestamped,
  })
  .strict();

const snapshotSchema = z
  .object({
    id: z.number().int().positive(),
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    takenAt: dateString,
    incomeCents: integer,
    fixedPrivateCents: integer,
    fixedSharedCents: integer,
    savingsRateCents: integer,
    savingsBalanceCents: integer,
    freeCashCents: integer,
  })
  .strict();

const snapshotMemberSchema = z
  .object({
    snapshotId: z.number().int().positive(),
    memberId: z.number().int().positive(),
    memberName: z.string().min(1),
    incomeCents: integer,
    ownFixedCents: integer,
    sharedShareCents: integer,
    remainderCents: integer,
  })
  .strict();

const appSettingSchema = z
  .object({
    key: z.string().min(1),
    value: z.unknown(),
    updatedAt: dateString,
  })
  .strict();

const backupSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT),
    version: z.union([z.literal(1), z.literal(2)]),
    exportedAt: dateString,
    household: householdSchema,
    members: z.array(memberSchema),
    incomes: z.array(incomeSchema),
    categories: z.array(categorySchema),
    defaultShares: z.array(defaultShareSchema),
    expenses: z.array(expenseSchema),
    expenseShares: z.array(expenseShareSchema),
    savingsPots: z.array(savingsPotSchema),
    snapshots: z.array(snapshotSchema),
    snapshotMembers: z.array(snapshotMemberSchema),
    appSettings: z.array(appSettingSchema),
  })
  .strict();

export type BackupPayload = z.infer<typeof backupSchema>;

function iso(date: Date): string {
  return date.toISOString();
}

function date(value: string): Date {
  return new Date(value);
}

function unique(values: (number | string)[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new RestoreValidationError(`Duplicate ${label}.`);
  }
}

function validateReferences(payload: BackupPayload): void {
  unique(
    payload.members.map((row) => row.id),
    "member id",
  );
  unique(
    payload.incomes.map((row) => row.id),
    "income id",
  );
  unique(
    payload.categories.map((row) => row.id),
    "category id",
  );
  unique(
    payload.expenses.map((row) => row.id),
    "expense id",
  );
  unique(
    payload.expenseShares.map((row) => `${row.expenseId}:${row.memberId}`),
    "expense share",
  );
  unique(
    payload.savingsPots.map((row) => row.id),
    "savings pot id",
  );
  unique(
    payload.snapshots.map((row) => row.id),
    "snapshot id",
  );
  unique(
    payload.snapshotMembers.map((row) => `${row.snapshotId}:${row.memberId}`),
    "snapshot member",
  );
  unique(
    payload.snapshots.map((row) => row.period),
    "snapshot period",
  );
  unique(
    payload.appSettings.map((row) => row.key),
    "app setting key",
  );

  const memberIds = new Set(payload.members.map((row) => row.id));
  const categoryIds = new Set(payload.categories.map((row) => row.id));
  const snapshotIds = new Set(payload.snapshots.map((row) => row.id));

  for (const row of payload.defaultShares) {
    if (!memberIds.has(row.memberId)) {
      throw new RestoreValidationError("Default share references an unknown member.");
    }
  }
  unique(
    payload.defaultShares.map((row) => row.memberId),
    "default share member",
  );
  if (
    payload.defaultShares.length > 0 &&
    payload.defaultShares.reduce((sum, row) => sum + row.shareBp, 0) !== 10_000
  ) {
    throw new RestoreValidationError("Default shares must add up to 100 %.");
  }

  for (const row of payload.incomes) {
    if (!memberIds.has(row.memberId)) {
      throw new RestoreValidationError("Income references an unknown member.");
    }
  }
  for (const row of payload.expenses) {
    if (row.categoryId !== null && !categoryIds.has(row.categoryId)) {
      throw new RestoreValidationError("Expense references an unknown category.");
    }
    if (row.scope === "private") {
      if (row.memberId === null || row.splitMode !== null) {
        throw new RestoreValidationError("Private expense has an invalid shape.");
      }
      if (!memberIds.has(row.memberId)) {
        throw new RestoreValidationError("Expense references an unknown member.");
      }
    } else if (row.memberId !== null || row.splitMode === null) {
      throw new RestoreValidationError("Shared expense has an invalid shape.");
    }
  }

  for (const row of payload.expenseShares) {
    const expense = payload.expenses.find((entry) => entry.id === row.expenseId);
    if (!expense || !memberIds.has(row.memberId)) {
      throw new RestoreValidationError("Expense share references an unknown row.");
    }
    if (expense.scope !== "shared" || expense.splitMode !== "fixed_quota") {
      throw new RestoreValidationError("Only fixed shared expenses may have shares.");
    }
  }
  for (const expense of payload.expenses.filter(
    (row) => row.scope === "shared" && row.splitMode === "fixed_quota",
  )) {
    const shares = payload.expenseShares.filter((row) => row.expenseId === expense.id);
    if (
      shares.length > 0 &&
      shares.reduce((sum, row) => sum + row.shareBp, 0) !== 10_000
    ) {
      throw new RestoreValidationError("Expense shares must add up to 100 %.");
    }
  }

  for (const row of payload.savingsPots) {
    if (row.ownerMemberId !== null && !memberIds.has(row.ownerMemberId)) {
      throw new RestoreValidationError("Savings pot references an unknown member.");
    }
  }
  for (const row of payload.snapshotMembers) {
    if (!snapshotIds.has(row.snapshotId) || !memberIds.has(row.memberId)) {
      throw new RestoreValidationError("Snapshot member references an unknown row.");
    }
  }

  const categoryNames = payload.categories.map((row) => row.name);
  if (new Set(categoryNames).size !== categoryNames.length) {
    throw new RestoreValidationError("Category names must be unique.");
  }
}

export function parseBackup(value: unknown): BackupPayload {
  const parsed = backupSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new RestoreValidationError(
      issue
        ? `${issue.path.join(".") || "backup"}: ${issue.message}`
        : "Invalid backup.",
    );
  }
  validateReferences(parsed.data);
  return parsed.data;
}

export function parseBackupJson(text: string): BackupPayload {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new RestoreValidationError("Backup is not valid JSON.");
  }
  return parseBackup(value);
}

export function exportBackup(db: Db = getDb(), exportedAt = new Date()): BackupPayload {
  if (Number.isNaN(exportedAt.getTime())) {
    throw new Error("Cannot export with an invalid date.");
  }

  const household = db
    .select()
    .from(schema.household)
    .where(eq(schema.household.id, 1))
    .get();
  if (!household) {
    throw new Error("The household row is missing.");
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: iso(exportedAt),
    household: {
      ...household,
      id: 1,
      createdAt: iso(household.createdAt),
      updatedAt: iso(household.updatedAt),
    },
    members: db
      .select()
      .from(schema.member)
      .orderBy(asc(schema.member.id))
      .all()
      .map((row) => ({
        ...row,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
      })),
    incomes: db
      .select()
      .from(schema.income)
      .orderBy(asc(schema.income.id))
      .all()
      .map((row) => ({
        ...row,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
      })),
    categories: db
      .select()
      .from(schema.category)
      .orderBy(asc(schema.category.id))
      .all()
      .map((row) => ({
        ...row,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
      })),
    defaultShares: db
      .select()
      .from(schema.defaultShare)
      .orderBy(asc(schema.defaultShare.memberId))
      .all(),
    expenses: db
      .select()
      .from(schema.expense)
      .orderBy(asc(schema.expense.id))
      .all()
      .map((row) => ({
        ...row,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
      })),
    expenseShares: db
      .select()
      .from(schema.expenseShare)
      .orderBy(asc(schema.expenseShare.expenseId), asc(schema.expenseShare.memberId))
      .all(),
    savingsPots: db
      .select()
      .from(schema.savingsPot)
      .orderBy(asc(schema.savingsPot.id))
      .all()
      .map((row) => ({
        ...row,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
      })),
    snapshots: db
      .select()
      .from(schema.snapshot)
      .orderBy(asc(schema.snapshot.id))
      .all()
      .map((row) => ({ ...row, takenAt: iso(row.takenAt) })),
    snapshotMembers: db
      .select()
      .from(schema.snapshotMember)
      .orderBy(
        asc(schema.snapshotMember.snapshotId),
        asc(schema.snapshotMember.memberId),
      )
      .all(),
    appSettings: db
      .select()
      .from(schema.appSetting)
      .orderBy(asc(schema.appSetting.key))
      .all()
      .map((row) => ({ ...row, updatedAt: iso(row.updatedAt) })),
  };
}

function checkSystemCategories(payload: BackupPayload, db: Db): void {
  const existing = db
    .select({ id: schema.category.id })
    .from(schema.category)
    .where(eq(schema.category.isSystem, true))
    .all()
    .map((row) => row.id);
  const imported = payload.categories
    .filter((row) => row.isSystem)
    .map((row) => row.id);
  if (
    existing.length !== imported.length ||
    existing.some((id) => !imported.includes(id)) ||
    imported.some((id) => !existing.includes(id))
  ) {
    throw new RestoreValidationError(
      "Backup does not contain the seeded system categories.",
    );
  }
}

export function restoreBackup(payload: BackupPayload, db: Db = getDb()): void {
  const validated = parseBackup(payload);

  db.transaction((tx) => {
    checkSystemCategories(validated, tx as unknown as Db);
    tx.delete(schema.snapshotMember).run();
    tx.delete(schema.expenseShare).run();
    tx.delete(schema.defaultShare).run();
    tx.delete(schema.income).run();
    tx.delete(schema.expense).run();
    tx.delete(schema.savingsPot).run();
    tx.delete(schema.snapshot).run();
    tx.delete(schema.member).run();
    tx.delete(schema.appSetting).run();
    tx.delete(schema.category).where(eq(schema.category.isSystem, false)).run();

    tx.update(schema.household)
      .set({
        name: validated.household.name,
        currency: validated.household.currency,
        defaultSplitMode: validated.household.defaultSplitMode,
        onboardingDone: validated.household.onboardingDone,
        createdAt: date(validated.household.createdAt),
        updatedAt: date(validated.household.updatedAt),
      })
      .where(eq(schema.household.id, 1))
      .run();

    const systemCategories = validated.categories.filter((entry) => entry.isSystem);
    const occupiedCategoryNames = new Set(
      tx
        .select({ name: schema.category.name })
        .from(schema.category)
        .all()
        .map((row) => row.name),
    );
    for (const row of systemCategories) {
      occupiedCategoryNames.add(row.name);
    }
    for (const row of systemCategories) {
      // A backup may contain a rename or a pair of swapped names. Move through
      // collision-free names before applying the canonical values.
      let temporaryName = `__kassenknoten_restore_${row.id}`;
      while (occupiedCategoryNames.has(temporaryName)) {
        temporaryName += "_";
      }
      occupiedCategoryNames.add(temporaryName);
      tx.update(schema.category)
        .set({
          name: temporaryName,
        })
        .where(eq(schema.category.id, row.id))
        .run();
    }
    for (const row of systemCategories) {
      tx.update(schema.category)
        .set({
          name: row.name,
          icon: row.icon,
          sortOrder: row.sortOrder,
          isSystem: true,
          createdAt: date(row.createdAt),
          updatedAt: date(row.updatedAt),
        })
        .where(eq(schema.category.id, row.id))
        .run();
    }
    if (validated.categories.some((row) => !row.isSystem)) {
      tx.insert(schema.category)
        .values(
          validated.categories
            .filter((row) => !row.isSystem)
            .map((row) => ({
              ...row,
              createdAt: date(row.createdAt),
              updatedAt: date(row.updatedAt),
            })),
        )
        .run();
    }
    if (validated.members.length > 0) {
      tx.insert(schema.member)
        .values(
          validated.members.map((row) => ({
            ...row,
            createdAt: date(row.createdAt),
            updatedAt: date(row.updatedAt),
          })),
        )
        .run();
    }
    // A version 1 file has no validity at all; everything in it was simply current.
    const fallbackFrom = periodFromDate(date(validated.household.createdAt));
    if (validated.incomes.length > 0) {
      tx.insert(schema.income)
        .values(
          validated.incomes.map((row) => ({
            ...row,
            validFrom: row.validFrom ?? fallbackFrom,
            validUntil: row.validUntil ?? null,
            createdAt: date(row.createdAt),
            updatedAt: date(row.updatedAt),
          })),
        )
        .run();
    }
    if (validated.expenses.length > 0) {
      tx.insert(schema.expense)
        .values(
          validated.expenses.map((row) => ({
            ...row,
            validFrom: row.validFrom ?? fallbackFrom,
            validUntil: row.validUntil ?? null,
            createdAt: date(row.createdAt),
            updatedAt: date(row.updatedAt),
          })),
        )
        .run();
    }
    if (validated.defaultShares.length > 0) {
      tx.insert(schema.defaultShare).values(validated.defaultShares).run();
    }
    if (validated.expenseShares.length > 0) {
      tx.insert(schema.expenseShare).values(validated.expenseShares).run();
    }
    if (validated.savingsPots.length > 0) {
      tx.insert(schema.savingsPot)
        .values(
          validated.savingsPots.map((row) => ({
            ...row,
            createdAt: date(row.createdAt),
            updatedAt: date(row.updatedAt),
          })),
        )
        .run();
    }
    if (validated.snapshots.length > 0) {
      tx.insert(schema.snapshot)
        .values(
          validated.snapshots.map((row) => ({ ...row, takenAt: date(row.takenAt) })),
        )
        .run();
    }
    if (validated.snapshotMembers.length > 0) {
      tx.insert(schema.snapshotMember).values(validated.snapshotMembers).run();
    }
    if (validated.appSettings.length > 0) {
      tx.insert(schema.appSetting)
        .values(
          validated.appSettings.map((row) => ({
            key: row.key,
            value: row.value,
            updatedAt: date(row.updatedAt),
          })),
        )
        .run();
    }
  });
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportPlanningCsv(db: Db = getDb()): string {
  const copy = de.sections.settings.csv;
  const members = db.select().from(schema.member).all();
  const categories = db.select().from(schema.category).all();
  const memberNames = new Map(members.map((row) => [row.id, row.name]));
  const categoryNames = new Map(categories.map((row) => [row.id, row.name]));
  const rows: (string | number | null)[][] = [[...copy.headers]];

  for (const row of db
    .select()
    .from(schema.income)
    .where(eq(schema.income.active, true))
    .orderBy(asc(schema.income.id))
    .all()) {
    rows.push([
      row.kind === "salary" ? copy.income : copy.otherIncome,
      row.label,
      memberNames.get(row.memberId) ?? copy.unknown,
      null,
      row.amountCents,
      row.intervalMonths,
      monthlyCents(row.amountCents, row.intervalMonths),
      null,
      null,
      null,
      null,
    ]);
  }

  for (const row of db
    .select()
    .from(schema.expense)
    .where(eq(schema.expense.active, true))
    .orderBy(asc(schema.expense.id))
    .all()) {
    rows.push([
      row.scope === "shared" ? copy.sharedExpense : copy.privateExpense,
      row.label,
      row.memberId === null
        ? copy.household
        : (memberNames.get(row.memberId) ?? copy.unknown),
      row.categoryId === null
        ? null
        : (categoryNames.get(row.categoryId) ?? copy.unknown),
      row.amountCents,
      row.intervalMonths,
      monthlyCents(row.amountCents, row.intervalMonths),
      null,
      null,
      null,
      row.splitMode,
    ]);
  }

  for (const row of db
    .select()
    .from(schema.savingsPot)
    .where(eq(schema.savingsPot.active, true))
    .orderBy(asc(schema.savingsPot.id))
    .all()) {
    rows.push([
      copy.savingsPot,
      row.name,
      row.ownerMemberId === null
        ? copy.household
        : (memberNames.get(row.ownerMemberId) ?? copy.unknown),
      null,
      null,
      1,
      null,
      row.monthlyRateCents,
      row.balanceCents,
      row.targetCents,
      null,
    ]);
  }

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
}
