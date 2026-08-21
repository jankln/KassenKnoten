import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { FULL_SHARE_BP, allocate } from "@/lib/domain/money";
import type { SplitContext, SplitMode } from "@/lib/domain/split";
import { incomeByMember } from "@/lib/domain/summary";
import { listMembersWithIncome } from "./members";

/**
 * Household-level settings and the context every split needs.
 *
 * The default split is a starting point, never an outcome: it pre-fills the form for a
 * new shared cost, and each cost keeps whatever was decided for it.
 */

export interface HouseholdSettings {
  name: string;
  defaultSplitMode: SplitMode;
  defaultShares: { memberId: number; shareBp: number }[];
}

export function getHouseholdSettings(db: Db = getDb()): HouseholdSettings {
  const row = db
    .select()
    .from(schema.household)
    .where(eq(schema.household.id, 1))
    .get();
  const shares = db.select().from(schema.defaultShare).all();

  return {
    name: row?.name ?? "Haushalt",
    defaultSplitMode: row?.defaultSplitMode ?? "fixed_quota",
    defaultShares: shares.map((share) => ({
      memberId: share.memberId,
      shareBp: share.shareBp,
    })),
  };
}

export function setDefaultSplit(
  input: { splitMode: SplitMode; shares: { memberId: number; shareBp: number }[] },
  db: Db = getDb(),
): void {
  db.transaction((tx) => {
    tx.update(schema.household)
      .set({ defaultSplitMode: input.splitMode, updatedAt: new Date() })
      .where(eq(schema.household.id, 1))
      .run();

    tx.delete(schema.defaultShare).run();
    if (input.shares.length > 0) {
      tx.insert(schema.defaultShare).values(input.shares).run();
    }
  });
}

/**
 * Everything `splitExpense` needs: who is in the household, the default quota and what
 * each person earns per month.
 */
export async function getSplitContext(db: Db = getDb()): Promise<SplitContext> {
  const members = await listMembersWithIncome(db);
  const settings = getHouseholdSettings(db);

  return {
    members: members.map((member) => ({ id: member.id, name: member.name })),
    defaultShares:
      settings.defaultShares.length > 0
        ? settings.defaultShares
        : evenShares(members.map((member) => member.id)),
    monthlyIncomeByMember: incomeByMember({
      members: members.map((member) => ({ id: member.id, name: member.name })),
      incomes: members.flatMap((member) =>
        member.incomes.map((entry) => ({
          memberId: member.id,
          amountCents: entry.amountCents,
          intervalMonths: entry.intervalMonths,
        })),
      ),
    }),
  };
}

/**
 * An even quota that still adds up to exactly 100 %. Three people get 33,34 / 33,33 /
 * 33,33 — the same largest-remainder logic that keeps the cents honest.
 */
export function evenShares(
  memberIds: number[],
): { memberId: number; shareBp: number }[] {
  const parts = allocate(
    FULL_SHARE_BP,
    memberIds.map(() => 1),
  );
  return memberIds.map((memberId, index) => ({
    memberId,
    shareBp: parts[index] ?? 0,
  }));
}
