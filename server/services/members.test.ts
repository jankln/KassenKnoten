import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  createIncome,
  createMember,
  listMembersWithIncome,
  memberExists,
  nextFreeColorIndex,
  removeIncome,
  restoreIncome,
  restoreMember,
  retireMember,
  updateIncome,
  updateMember,
} from "./members";

let dir: string;
let handle: ReturnType<typeof createDb>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "kk-members-"));
  handle = createDb(join(dir, "test.db"));
});

afterEach(() => {
  handle.sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

function db() {
  return handle.db;
}

describe("members", () => {
  it("lists members in the order they were added", async () => {
    createMember({ name: "Alex", colorIndex: 1 }, db());
    createMember({ name: "Robin", colorIndex: 2 }, db());

    const members = await listMembersWithIncome(db());
    expect(members.map((member) => member.name)).toEqual(["Alex", "Robin"]);
  });

  it("gives each new person an unused colour", () => {
    expect(nextFreeColorIndex(db())).toBe(1);
    createMember({ name: "Alex", colorIndex: 1 }, db());
    expect(nextFreeColorIndex(db())).toBe(2);
    createMember({ name: "Robin", colorIndex: 2 }, db());
    expect(nextFreeColorIndex(db())).toBe(3);
  });

  it("reuses the colour of a retired person", () => {
    const id = createMember({ name: "Alex", colorIndex: 1 }, db());
    createMember({ name: "Robin", colorIndex: 2 }, db());
    retireMember(id, db());
    expect(nextFreeColorIndex(db())).toBe(1);
  });

  it("renames and recolours", async () => {
    const id = createMember({ name: "Alex", colorIndex: 1 }, db());
    updateMember(id, { name: "Alexandra", colorIndex: 4 }, db());

    const [member] = await listMembersWithIncome(db());
    expect(member).toMatchObject({ name: "Alexandra", colorIndex: 4 });
  });

  it("retires a person without losing them, and restores them unchanged", async () => {
    const id = createMember({ name: "Alex", colorIndex: 1 }, db());
    createIncome(
      {
        validFrom: "2026-01",
        validUntil: null,
        memberId: id,
        label: "Gehalt",
        kind: "salary",
        amountCents: 184_000,
        intervalMonths: 1,
      },
      db(),
    );

    retireMember(id, db());
    expect(await listMembersWithIncome(db())).toHaveLength(0);
    expect(memberExists(id, db())).toBe(false);

    restoreMember(id, db());
    const [member] = await listMembersWithIncome(db());
    expect(member?.name).toBe("Alex");
    // The income came back with them, which is the point of retiring rather than deleting.
    expect(member?.monthlyIncomeCents).toBe(184_000);
  });
});

describe("income", () => {
  it("sums every source of a person, normalised to a month", async () => {
    const id = createMember({ name: "Alex", colorIndex: 1 }, db());
    createIncome(
      {
        validFrom: "2026-01",
        validUntil: null,
        memberId: id,
        label: "Gehalt",
        kind: "salary",
        amountCents: 184_000,
        intervalMonths: 1,
      },
      db(),
    );
    createIncome(
      {
        validFrom: "2026-01",
        validUntil: null,
        memberId: id,
        label: "Bonus",
        kind: "other",
        amountCents: 120_000,
        intervalMonths: 12,
      },
      db(),
    );

    const [member] = await listMembersWithIncome(db());
    expect(member?.monthlyIncomeCents).toBe(184_000 + 10_000);
    expect(member?.incomes.map((entry) => entry.monthlyCents)).toEqual([
      184_000, 10_000,
    ]);
  });

  it("edits an entry in place", async () => {
    const memberId = createMember({ name: "Alex", colorIndex: 1 }, db());
    const incomeId = createIncome(
      {
        validFrom: "2026-01",
        validUntil: null,
        memberId,
        label: "Gehalt",
        kind: "salary",
        amountCents: 184_000,
        intervalMonths: 1,
      },
      db(),
    );

    updateIncome(
      incomeId,
      {
        validFrom: "2026-01",
        validUntil: null,
        memberId,
        label: "Gehalt netto",
        kind: "salary",
        amountCents: 190_000,
        intervalMonths: 1,
      },
      db(),
    );

    const [member] = await listMembersWithIncome(db());
    expect(member?.incomes[0]).toMatchObject({
      label: "Gehalt netto",
      amountCents: 190_000,
    });
  });

  it("removes an entry undoably", async () => {
    const memberId = createMember({ name: "Alex", colorIndex: 1 }, db());
    const incomeId = createIncome(
      {
        validFrom: "2026-01",
        validUntil: null,
        memberId,
        label: "Gehalt",
        kind: "salary",
        amountCents: 184_000,
        intervalMonths: 1,
      },
      db(),
    );

    removeIncome(incomeId, db());
    expect((await listMembersWithIncome(db()))[0]?.monthlyIncomeCents).toBe(0);

    restoreIncome(incomeId, db());
    expect((await listMembersWithIncome(db()))[0]?.monthlyIncomeCents).toBe(184_000);
  });

  it("reports a person with no income as zero, not as missing", async () => {
    createMember({ name: "Alex", colorIndex: 1 }, db());
    const [member] = await listMembersWithIncome(db());
    expect(member?.monthlyIncomeCents).toBe(0);
    expect(member?.incomes).toEqual([]);
  });
});

describe("editing an income with a later start", () => {
  it("splits the row instead of rewriting the months before it", () => {
    const alex = createMember({ name: "Alex", colorIndex: 1 }, db());
    const id = createIncome(
      {
        memberId: alex,
        label: "Gehalt",
        kind: "salary",
        amountCents: 205_000,
        intervalMonths: 1,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );

    const newId = updateIncome(
      id,
      {
        memberId: alex,
        label: "Gehalt",
        kind: "salary",
        amountCents: 220_000,
        intervalMonths: 1,
        validFrom: "2026-03",
        validUntil: null,
      },
      db(),
    );

    expect(newId).not.toBe(id);
    const rows = db()
      .select()
      .from(schema.income)
      .orderBy(schema.income.validFrom)
      .all();
    expect(rows.map((row) => [row.amountCents, row.validFrom, row.validUntil])).toEqual(
      [
        [205_000, "2026-01", "2026-02"],
        [220_000, "2026-03", null],
      ],
    );
  });

  it("corrects the row in place when the start does not move", () => {
    const alex = createMember({ name: "Alex", colorIndex: 1 }, db());
    const id = createIncome(
      {
        memberId: alex,
        label: "Gehatl",
        kind: "salary",
        amountCents: 205_000,
        intervalMonths: 1,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );

    const sameId = updateIncome(
      id,
      {
        memberId: alex,
        label: "Gehalt",
        kind: "salary",
        amountCents: 250_000,
        intervalMonths: 1,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );

    expect(sameId).toBe(id);
    const rows = db().select().from(schema.income).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe("Gehalt");
    expect(rows[0]?.amountCents).toBe(250_000);
  });

  // A contract ending in June does not become open-ended because the rate changed.
  it("carries a planned end over to the split-off row", () => {
    const alex = createMember({ name: "Alex", colorIndex: 1 }, db());
    const id = createIncome(
      {
        memberId: alex,
        label: "Werkvertrag",
        kind: "other",
        amountCents: 50_000,
        intervalMonths: 1,
        validFrom: "2026-01",
        validUntil: "2026-06",
      },
      db(),
    );

    updateIncome(
      id,
      {
        memberId: alex,
        label: "Werkvertrag",
        kind: "other",
        amountCents: 60_000,
        intervalMonths: 1,
        validFrom: "2026-04",
        validUntil: null,
      },
      db(),
    );

    const rows = db()
      .select()
      .from(schema.income)
      .orderBy(schema.income.validFrom)
      .all();
    expect(rows.map((row) => [row.amountCents, row.validFrom, row.validUntil])).toEqual(
      [
        [50_000, "2026-01", "2026-03"],
        [60_000, "2026-04", "2026-06"],
      ],
    );
  });
});
