import { and, asc, desc, eq, gte, isNull, like, lte, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { comparePeriods, previousPeriod, type Period } from "@/lib/domain/period";
import {
  splitExpense,
  type MemberShare,
  type SplitContext,
  type SplitMode,
} from "@/lib/domain/split";
import {
  budgetUsageBp,
  countedCents,
  remainingCents,
  type VariableMode,
} from "@/lib/domain/variable";

/**
 * Variable costs: budgets for what is not the same every month, and the receipts booked
 * against them.
 *
 * Everything here is read for **one month**. A fixed cost is the same in every month it
 * is valid for, so its screen never had to know which month it was showing; a variable
 * cost does — its bookings belong to a month, and in `detailed` mode they are the figure.
 * So a period is a required argument rather than a convenience, and no function in this
 * module can accidentally report "now" while the screen shows March.
 */

export interface BookingRow {
  id: number;
  bookedOn: string;
  label: string | null;
  amountCents: number;
}

export interface VariableCostRow {
  id: number;
  scope: "private" | "shared";
  memberId: number | null;
  label: string;
  mode: VariableMode;
  /** The budget for the month. */
  plannedCents: number;
  /** What the receipts of this month add up to. */
  bookedCents: number;
  /** The figure that reaches the household summary — the plan or the bookings. */
  countedCents: number;
  /** Share of the budget used, in basis points; null when there is no budget. */
  usageBp: number | null;
  /** Budget minus bookings. Negative once it is overspent. */
  remainingCents: number;
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  splitMode: SplitMode | null;
  shares: { memberId: number; shareBp: number }[];
  /** Who pays what of `countedCents`. Empty for a private budget. */
  perMember: MemberShare[];
  /** The receipts of this month, newest first. Only ever filled in `detailed` mode. */
  bookings: BookingRow[];
  validFrom: Period;
  validUntil: Period | null;
}

export interface MemberVariableCosts {
  memberId: number;
  name: string;
  colorIndex: number;
  costs: VariableCostRow[];
  /** What this member's own budgets count for this month. */
  countedCents: number;
  plannedCents: number;
  bookedCents: number;
}

/**
 * Budgets that applied in `period`: started on or before it, and either open-ended or
 * not yet finished. `YYYY-MM` strings order correctly as plain text, so this is the same
 * indexed comparison the dashboard uses for incomes and fixed costs.
 */
function appliesIn(period: Period) {
  return and(
    lte(schema.variableCost.validFrom, period),
    or(
      isNull(schema.variableCost.validUntil),
      gte(schema.variableCost.validUntil, period),
    ),
  );
}

/** Every active budget valid in `period`, with that month's bookings resolved. */
export function listVariableCosts(
  period: Period,
  context: SplitContext,
  db: Db = getDb(),
): VariableCostRow[] {
  const rows = db
    .select({
      id: schema.variableCost.id,
      scope: schema.variableCost.scope,
      memberId: schema.variableCost.memberId,
      label: schema.variableCost.label,
      mode: schema.variableCost.mode,
      plannedCents: schema.variableCost.plannedCents,
      splitMode: schema.variableCost.splitMode,
      sortOrder: schema.variableCost.sortOrder,
      validFrom: schema.variableCost.validFrom,
      validUntil: schema.variableCost.validUntil,
      categoryId: schema.category.id,
      categoryName: schema.category.name,
      categoryIcon: schema.category.icon,
    })
    .from(schema.variableCost)
    .leftJoin(schema.category, eq(schema.variableCost.categoryId, schema.category.id))
    .where(and(eq(schema.variableCost.active, true), appliesIn(period)))
    .orderBy(asc(schema.variableCost.sortOrder), asc(schema.variableCost.id))
    .all();

  if (rows.length === 0) {
    return [];
  }

  const shares = db.select().from(schema.variableCostShare).all();
  const bookings = listBookingsForPeriod(period, db);

  return rows.map((row) => {
    const own = shares
      .filter((share) => share.variableCostId === row.id)
      .map((share) => ({ memberId: share.memberId, shareBp: share.shareBp }));
    const ownBookings = bookings.filter((booking) => booking.variableCostId === row.id);
    const bookedCents = ownBookings.reduce(
      (total, booking) => total + booking.amountCents,
      0,
    );
    const counted = countedCents({
      mode: row.mode,
      plannedCents: row.plannedCents,
      bookedCents,
    });

    const perMember =
      row.scope === "shared"
        ? splitExpense(
            {
              amountCents: counted,
              intervalMonths: 1,
              splitMode: row.splitMode ?? "fixed_quota",
              ...(own.length > 0 ? { shares: own } : {}),
            },
            context,
          ).perMember
        : [];

    return {
      id: row.id,
      scope: row.scope,
      memberId: row.memberId,
      label: row.label,
      mode: row.mode,
      plannedCents: row.plannedCents,
      bookedCents,
      countedCents: counted,
      usageBp: budgetUsageBp(row.plannedCents, bookedCents),
      remainingCents: remainingCents(row.plannedCents, bookedCents),
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryIcon: row.categoryIcon,
      splitMode: row.splitMode,
      shares: own,
      perMember,
      bookings: ownBookings.map((booking) => ({
        id: booking.id,
        bookedOn: booking.bookedOn,
        label: booking.label,
        amountCents: booking.amountCents,
      })),
      validFrom: row.validFrom,
      validUntil: row.validUntil,
    };
  });
}

/** Private budgets for `period`, grouped under the person they belong to. */
export function groupPrivateByMember(
  costs: VariableCostRow[],
  members: { id: number; name: string; colorIndex: number }[],
): MemberVariableCosts[] {
  return members.map((member) => {
    const own = costs.filter(
      (cost) => cost.scope === "private" && cost.memberId === member.id,
    );
    return {
      memberId: member.id,
      name: member.name,
      colorIndex: member.colorIndex,
      costs: own,
      countedCents: own.reduce((total, cost) => total + cost.countedCents, 0),
      plannedCents: own.reduce((total, cost) => total + cost.plannedCents, 0),
      bookedCents: own.reduce((total, cost) => total + cost.bookedCents, 0),
    };
  });
}

function listBookingsForPeriod(period: Period, db: Db) {
  return db
    .select()
    .from(schema.variableBooking)
    .where(
      and(
        eq(schema.variableBooking.active, true),
        like(schema.variableBooking.bookedOn, `${period}-%`),
      ),
    )
    .orderBy(desc(schema.variableBooking.bookedOn), desc(schema.variableBooking.id))
    .all();
}

/* ------------------------------------------------------------------------- *
 * Budgets
 * ------------------------------------------------------------------------- */

export interface VariableCostWrite {
  scope: "private" | "shared";
  memberId?: number | null;
  label: string;
  mode: VariableMode;
  plannedCents: number;
  categoryId?: number | null;
  splitMode?: SplitMode | null;
  shares?: { memberId: number; shareBp: number }[];
  validFrom: Period;
  validUntil: Period | null;
}

export function createVariableCost(input: VariableCostWrite, db: Db = getDb()): number {
  return db.transaction((tx) => {
    const id = tx
      .insert(schema.variableCost)
      .values(values(input))
      .returning({ id: schema.variableCost.id })
      .get().id;
    writeShares(tx as unknown as Db, id, input);
    return id;
  });
}

/**
 * Update a budget, splitting the row when it starts applying later.
 *
 * Same rule as fixed costs: moving the start forward is a change of plan and must leave
 * the earlier months reporting what they reported. The extra step here is the receipts —
 * bookings dated on or after the new start belong to the new row, or they would sit on a
 * row that is no longer valid in their own month and silently stop counting.
 */
export function updateVariableCost(
  id: number,
  input: VariableCostWrite,
  db: Db = getDb(),
): number {
  return db.transaction((tx) => {
    const existing = tx
      .select({
        validFrom: schema.variableCost.validFrom,
        validUntil: schema.variableCost.validUntil,
      })
      .from(schema.variableCost)
      .where(eq(schema.variableCost.id, id))
      .get();

    if (existing && comparePeriods(input.validFrom, existing.validFrom) > 0) {
      tx.update(schema.variableCost)
        .set({ validUntil: previousPeriod(input.validFrom), updatedAt: new Date() })
        .where(eq(schema.variableCost.id, id))
        .run();

      const created = tx
        .insert(schema.variableCost)
        .values({
          ...values(input),
          validUntil: input.validUntil ?? existing.validUntil,
        })
        .returning({ id: schema.variableCost.id })
        .get().id;
      writeShares(tx as unknown as Db, created, input);

      tx.update(schema.variableBooking)
        .set({ variableCostId: created, updatedAt: new Date() })
        .where(
          and(
            eq(schema.variableBooking.variableCostId, id),
            gte(schema.variableBooking.bookedOn, `${input.validFrom}-01`),
          ),
        )
        .run();

      return created;
    }

    tx.update(schema.variableCost)
      .set({ ...values(input), updatedAt: new Date() })
      .where(eq(schema.variableCost.id, id))
      .run();
    tx.delete(schema.variableCostShare)
      .where(eq(schema.variableCostShare.variableCostId, id))
      .run();
    writeShares(tx as unknown as Db, id, input);
    return id;
  });
}

function values(input: VariableCostWrite) {
  return {
    scope: input.scope,
    memberId: input.scope === "private" ? (input.memberId ?? null) : null,
    label: input.label,
    mode: input.mode,
    plannedCents: input.plannedCents,
    categoryId: input.categoryId ?? null,
    splitMode: input.scope === "shared" ? (input.splitMode ?? "fixed_quota") : null,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
  };
}

function writeShares(db: Db, variableCostId: number, input: VariableCostWrite): void {
  if (input.scope !== "shared" || input.splitMode !== "fixed_quota") {
    return;
  }
  if (!input.shares?.length) {
    return;
  }
  db.insert(schema.variableCostShare)
    .values(input.shares.map((share) => ({ ...share, variableCostId })))
    .run();
}

/** Retire rather than delete, so removing one is undoable and history stays intact. */
export function retireVariableCost(id: number, db: Db = getDb()): void {
  db.update(schema.variableCost)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.variableCost.id, id))
    .run();
}

export function restoreVariableCost(id: number, db: Db = getDb()): void {
  db.update(schema.variableCost)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(schema.variableCost.id, id))
    .run();
}

/* ------------------------------------------------------------------------- *
 * Bookings
 * ------------------------------------------------------------------------- */

export interface BookingWrite {
  variableCostId: number;
  bookedOn: string;
  label?: string | null;
  amountCents: number;
}

export function createBooking(input: BookingWrite, db: Db = getDb()): number {
  return db
    .insert(schema.variableBooking)
    .values({
      variableCostId: input.variableCostId,
      bookedOn: input.bookedOn,
      label: input.label?.trim() || null,
      amountCents: input.amountCents,
    })
    .returning({ id: schema.variableBooking.id })
    .get().id;
}

export function updateBooking(id: number, input: BookingWrite, db: Db = getDb()): void {
  db.update(schema.variableBooking)
    .set({
      bookedOn: input.bookedOn,
      label: input.label?.trim() || null,
      amountCents: input.amountCents,
      updatedAt: new Date(),
    })
    .where(eq(schema.variableBooking.id, id))
    .run();
}

export function retireBooking(id: number, db: Db = getDb()): void {
  db.update(schema.variableBooking)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.variableBooking.id, id))
    .run();
}

export function restoreBooking(id: number, db: Db = getDb()): void {
  db.update(schema.variableBooking)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(schema.variableBooking.id, id))
    .run();
}

/** The budget a booking belongs to, so an action can check it exists before writing. */
export function variableCostExists(id: number, db: Db = getDb()): boolean {
  return (
    db
      .select({ id: schema.variableCost.id })
      .from(schema.variableCost)
      .where(eq(schema.variableCost.id, id))
      .get() !== undefined
  );
}
