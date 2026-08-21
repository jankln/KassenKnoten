import { and, asc, eq, max } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { sumMonthlyCents } from "@/lib/domain/interval";
import {
  MAX_COLOR_INDEX,
  type IncomeInput,
  type MemberInput,
} from "@/lib/validation/member";

/**
 * Everything the household screen reads and writes.
 *
 * The database handle is a parameter with a default, so tests can run the real logic
 * against a temporary file instead of mocking a layer that would then prove nothing.
 */

export interface IncomeRow {
  id: number;
  label: string;
  kind: "salary" | "other";
  amountCents: number;
  intervalMonths: number;
  /** The amount normalised to a month, which is what the plan works in. */
  monthlyCents: number;
}

export interface MemberWithIncome {
  id: number;
  name: string;
  colorIndex: number;
  incomes: IncomeRow[];
  monthlyIncomeCents: number;
}

export async function listMembersWithIncome(
  db: Db = getDb(),
): Promise<MemberWithIncome[]> {
  const members = db
    .select()
    .from(schema.member)
    .where(eq(schema.member.active, true))
    .orderBy(asc(schema.member.sortOrder), asc(schema.member.id))
    .all();

  const incomes = db
    .select()
    .from(schema.income)
    .where(eq(schema.income.active, true))
    .orderBy(asc(schema.income.id))
    .all();

  return members.map((member) => {
    const own = incomes
      .filter((entry) => entry.memberId === member.id)
      .map<IncomeRow>((entry) => ({
        id: entry.id,
        label: entry.label,
        kind: entry.kind,
        amountCents: entry.amountCents,
        intervalMonths: entry.intervalMonths,
        monthlyCents: sumMonthlyCents([entry]),
      }));

    return {
      id: member.id,
      name: member.name,
      colorIndex: member.colorIndex,
      incomes: own,
      monthlyIncomeCents: sumMonthlyCents(own),
    };
  });
}

/** The colour nobody is using yet, so two people never start out indistinguishable. */
export function nextFreeColorIndex(db: Db = getDb()): number {
  const used = new Set(
    db
      .select({ colorIndex: schema.member.colorIndex })
      .from(schema.member)
      .where(eq(schema.member.active, true))
      .all()
      .map((row) => row.colorIndex),
  );

  for (let index = 1; index <= MAX_COLOR_INDEX; index += 1) {
    if (!used.has(index)) {
      return index;
    }
  }
  return 1;
}

export function createMember(input: MemberInput, db: Db = getDb()): number {
  const highest =
    db
      .select({ value: max(schema.member.sortOrder) })
      .from(schema.member)
      .get()?.value ?? 0;

  return db
    .insert(schema.member)
    .values({ ...input, sortOrder: highest + 1 })
    .returning({ id: schema.member.id })
    .get().id;
}

export function updateMember(id: number, input: MemberInput, db: Db = getDb()): void {
  db.update(schema.member)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.member.id, id))
    .run();
}

/**
 * Retire a person instead of deleting them. Their income goes with them, but the rows
 * survive, so an accidental tap is undoable and past months keep resolving to a name.
 */
export function retireMember(id: number, db: Db = getDb()): void {
  db.update(schema.member)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.member.id, id))
    .run();
}

export function restoreMember(id: number, db: Db = getDb()): void {
  db.update(schema.member)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(schema.member.id, id))
    .run();
}

export function createIncome(input: IncomeInput, db: Db = getDb()): number {
  return db
    .insert(schema.income)
    .values(input)
    .returning({ id: schema.income.id })
    .get().id;
}

export function updateIncome(id: number, input: IncomeInput, db: Db = getDb()): void {
  db.update(schema.income)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.income.id, id))
    .run();
}

export function removeIncome(id: number, db: Db = getDb()): void {
  db.update(schema.income)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.income.id, id))
    .run();
}

export function restoreIncome(id: number, db: Db = getDb()): void {
  db.update(schema.income)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(schema.income.id, id))
    .run();
}

/** Guard for actions: an id must belong to a row that actually exists. */
export function memberExists(id: number, db: Db = getDb()): boolean {
  return (
    db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(and(eq(schema.member.id, id), eq(schema.member.active, true)))
      .get() !== undefined
  );
}
