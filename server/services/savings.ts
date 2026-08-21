import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import type { SavingsPotInput } from "@/lib/validation/savings";

export interface SavingsPotRow {
  id: number;
  name: string;
  ownerMemberId: number | null;
  ownerName: string | null;
  ownerColorIndex: number | null;
  monthlyRateCents: number;
  balanceCents: number;
  targetCents: number | null;
  note: string | null;
  /** Capped at 10000 (100 %), or null when no target was set. */
  progressBp: number | null;
  overTarget: boolean;
}

function progressFor(balanceCents: number, targetCents: number | null) {
  if (targetCents === null) {
    return null;
  }
  return Math.min(10_000, Math.floor((balanceCents * 10_000) / targetCents));
}

export function listSavingsPots(db: Db = getDb()): SavingsPotRow[] {
  const rows = db
    .select({
      id: schema.savingsPot.id,
      name: schema.savingsPot.name,
      ownerMemberId: schema.savingsPot.ownerMemberId,
      ownerName: schema.member.name,
      ownerColorIndex: schema.member.colorIndex,
      monthlyRateCents: schema.savingsPot.monthlyRateCents,
      balanceCents: schema.savingsPot.balanceCents,
      targetCents: schema.savingsPot.targetCents,
      note: schema.savingsPot.note,
    })
    .from(schema.savingsPot)
    .leftJoin(schema.member, eq(schema.savingsPot.ownerMemberId, schema.member.id))
    .where(eq(schema.savingsPot.active, true))
    .orderBy(asc(schema.savingsPot.sortOrder), asc(schema.savingsPot.id))
    .all();

  return rows.map((row) => ({
    ...row,
    progressBp: progressFor(row.balanceCents, row.targetCents),
    overTarget: row.targetCents !== null && row.balanceCents > row.targetCents,
  }));
}

function activeMemberExists(memberId: number, db: Db): boolean {
  return (
    db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(and(eq(schema.member.id, memberId), eq(schema.member.active, true)))
      .get() !== undefined
  );
}

function validateOwner(ownerMemberId: number | null | undefined, db: Db): void {
  if (ownerMemberId !== null && ownerMemberId !== undefined) {
    if (!activeMemberExists(ownerMemberId, db)) {
      throw new Error("Savings pot owner does not exist.");
    }
  }
}

export function createSavingsPot(input: SavingsPotInput, db: Db = getDb()): number {
  validateOwner(input.ownerMemberId, db);
  return db
    .insert(schema.savingsPot)
    .values({
      name: input.name,
      ownerMemberId: input.ownerMemberId ?? null,
      monthlyRateCents: input.monthlyRateCents,
      balanceCents: input.balanceCents,
      targetCents: input.targetCents ?? null,
      note: input.note ?? null,
    })
    .returning({ id: schema.savingsPot.id })
    .get().id;
}

export function updateSavingsPot(
  id: number,
  input: SavingsPotInput,
  db: Db = getDb(),
): void {
  validateOwner(input.ownerMemberId, db);
  db.update(schema.savingsPot)
    .set({
      name: input.name,
      ownerMemberId: input.ownerMemberId ?? null,
      monthlyRateCents: input.monthlyRateCents,
      balanceCents: input.balanceCents,
      targetCents: input.targetCents ?? null,
      note: input.note ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.savingsPot.id, id))
    .run();
}

export function retireSavingsPot(id: number, db: Db = getDb()): void {
  db.update(schema.savingsPot)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.savingsPot.id, id))
    .run();
}

export function restoreSavingsPot(id: number, db: Db = getDb()): void {
  db.update(schema.savingsPot)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(schema.savingsPot.id, id))
    .run();
}
