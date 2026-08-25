import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import type { SplitContext } from "@/lib/domain/split";
import { createMember } from "./members";
import {
  createBooking,
  createVariableCost,
  groupPrivateByMember,
  listVariableCosts,
  restoreVariableCost,
  retireBooking,
  retireVariableCost,
  updateVariableCost,
} from "./variable-costs";

let dir: string;
let handle: ReturnType<typeof createDb>;
let alex: number;
let robin: number;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "kk-variable-"));
  handle = createDb(join(dir, "test.db"));
  alex = createMember({ name: "Alex", colorIndex: 1 }, handle.db);
  robin = createMember({ name: "Robin", colorIndex: 2 }, handle.db);
});

afterEach(() => {
  handle.sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

function db() {
  return handle.db;
}

function context(): SplitContext {
  return {
    members: [
      { id: alex, name: "Alex" },
      { id: robin, name: "Robin" },
    ],
    defaultShares: [
      { memberId: alex, shareBp: 5000 },
      { memberId: robin, shareBp: 5000 },
    ],
    monthlyIncomeByMember: new Map([
      [alex, 205_000],
      [robin, 231_000],
    ]),
  };
}

describe("plan mode", () => {
  it("counts the planned figure, whatever anyone booked", () => {
    const id = createVariableCost(
      {
        scope: "private",
        memberId: alex,
        label: "Tanken",
        mode: "plan",
        plannedCents: 12_000,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );
    createBooking(
      { variableCostId: id, bookedOn: "2026-03-04", amountCents: 5_000 },
      db(),
    );

    const [cost] = listVariableCosts("2026-03", context(), db());
    expect(cost?.countedCents).toBe(12_000);
    // The bookings are still reported, so a screen can show them if it wants to.
    expect(cost?.bookedCents).toBe(5_000);
  });
});

describe("detailed mode", () => {
  it("counts only the bookings that fall in the month being read", () => {
    const id = createVariableCost(
      {
        scope: "shared",
        label: "Lebensmittel",
        mode: "detailed",
        plannedCents: 30_000,
        splitMode: "fixed_quota",
        shares: [
          { memberId: alex, shareBp: 5000 },
          { memberId: robin, shareBp: 5000 },
        ],
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );
    createBooking(
      { variableCostId: id, bookedOn: "2026-02-27", amountCents: 4_000 },
      db(),
    );
    createBooking(
      { variableCostId: id, bookedOn: "2026-03-01", amountCents: 8_420 },
      db(),
    );
    createBooking(
      { variableCostId: id, bookedOn: "2026-03-31", amountCents: 1_580 },
      db(),
    );

    const [march] = listVariableCosts("2026-03", context(), db());
    expect(march?.bookedCents).toBe(10_000);
    expect(march?.countedCents).toBe(10_000);
    expect(march?.bookings).toHaveLength(2);

    const [february] = listVariableCosts("2026-02", context(), db());
    expect(february?.countedCents).toBe(4_000);
  });

  it("counts a month with no receipts as nothing, and still reports the budget", () => {
    createVariableCost(
      {
        scope: "private",
        memberId: alex,
        label: "Ausgehen",
        mode: "detailed",
        plannedCents: 15_000,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );

    const [cost] = listVariableCosts("2026-04", context(), db());
    expect(cost?.countedCents).toBe(0);
    expect(cost?.plannedCents).toBe(15_000);
    expect(cost?.usageBp).toBe(0);
    expect(cost?.remainingCents).toBe(15_000);
  });

  it("reports an overspent budget as overspent", () => {
    const id = createVariableCost(
      {
        scope: "private",
        memberId: alex,
        label: "Ausgehen",
        mode: "detailed",
        plannedCents: 10_000,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );
    createBooking(
      { variableCostId: id, bookedOn: "2026-03-04", amountCents: 14_000 },
      db(),
    );

    const [cost] = listVariableCosts("2026-03", context(), db());
    expect(cost?.remainingCents).toBe(-4_000);
    expect(cost?.usageBp).toBe(14_000);
  });

  it("leaves a removed receipt out of the month", () => {
    const id = createVariableCost(
      {
        scope: "private",
        memberId: alex,
        label: "Ausgehen",
        mode: "detailed",
        plannedCents: 10_000,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );
    const booking = createBooking(
      { variableCostId: id, bookedOn: "2026-03-04", amountCents: 3_000 },
      db(),
    );
    createBooking(
      { variableCostId: id, bookedOn: "2026-03-05", amountCents: 2_000 },
      db(),
    );
    retireBooking(booking, db());

    const [cost] = listVariableCosts("2026-03", context(), db());
    expect(cost?.bookedCents).toBe(2_000);
  });
});

describe("splitting", () => {
  it("divides a shared budget by its own quota, to the cent", () => {
    const id = createVariableCost(
      {
        scope: "shared",
        label: "Lebensmittel",
        mode: "detailed",
        plannedCents: 30_000,
        splitMode: "fixed_quota",
        shares: [
          { memberId: alex, shareBp: 5000 },
          { memberId: robin, shareBp: 5000 },
        ],
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );
    createBooking(
      { variableCostId: id, bookedOn: "2026-03-04", amountCents: 30_001 },
      db(),
    );

    const [cost] = listVariableCosts("2026-03", context(), db());
    const cents = cost?.perMember.map((share) => share.cents) ?? [];
    expect(cents).toEqual([15_001, 15_000]);
    expect(cents[0]! + cents[1]!).toBe(cost?.countedCents);
  });

  it("leaves a private budget unsplit", () => {
    createVariableCost(
      {
        scope: "private",
        memberId: robin,
        label: "Tanken",
        mode: "plan",
        plannedCents: 8_000,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );

    const costs = listVariableCosts("2026-03", context(), db());
    expect(costs[0]?.perMember).toEqual([]);

    const groups = groupPrivateByMember(costs, [
      { id: alex, name: "Alex", colorIndex: 1 },
      { id: robin, name: "Robin", colorIndex: 2 },
    ]);
    expect(groups.find((group) => group.memberId === robin)?.countedCents).toBe(8_000);
    expect(groups.find((group) => group.memberId === alex)?.countedCents).toBe(0);
  });
});

describe("validity", () => {
  it("only appears in the months it applies to", () => {
    createVariableCost(
      {
        scope: "private",
        memberId: alex,
        label: "Tanken",
        mode: "plan",
        plannedCents: 8_000,
        validFrom: "2026-03",
        validUntil: "2026-05",
      },
      db(),
    );

    expect(listVariableCosts("2026-02", context(), db())).toHaveLength(0);
    expect(listVariableCosts("2026-03", context(), db())).toHaveLength(1);
    expect(listVariableCosts("2026-05", context(), db())).toHaveLength(1);
    expect(listVariableCosts("2026-06", context(), db())).toHaveLength(0);
  });

  it("splits the row when the budget changes from a later month", () => {
    const id = createVariableCost(
      {
        scope: "private",
        memberId: alex,
        label: "Lebensmittel",
        mode: "plan",
        plannedCents: 30_000,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );

    updateVariableCost(
      id,
      {
        scope: "private",
        memberId: alex,
        label: "Lebensmittel",
        mode: "plan",
        plannedCents: 35_000,
        validFrom: "2026-06",
        validUntil: null,
      },
      db(),
    );

    expect(listVariableCosts("2026-05", context(), db())[0]?.plannedCents).toBe(30_000);
    expect(listVariableCosts("2026-06", context(), db())[0]?.plannedCents).toBe(35_000);
  });

  /**
   * The failure this guards against is silent: the receipt is still in the database, on
   * a row that stopped being valid in its own month, so the month it belongs to simply
   * reports less than was spent.
   */
  it("moves receipts from the new month onto the new row when a budget splits", () => {
    const id = createVariableCost(
      {
        scope: "private",
        memberId: alex,
        label: "Lebensmittel",
        mode: "detailed",
        plannedCents: 30_000,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );
    createBooking(
      { variableCostId: id, bookedOn: "2026-05-20", amountCents: 4_000 },
      db(),
    );
    createBooking(
      { variableCostId: id, bookedOn: "2026-06-02", amountCents: 7_000 },
      db(),
    );

    updateVariableCost(
      id,
      {
        scope: "private",
        memberId: alex,
        label: "Lebensmittel",
        mode: "detailed",
        plannedCents: 35_000,
        validFrom: "2026-06",
        validUntil: null,
      },
      db(),
    );

    expect(listVariableCosts("2026-05", context(), db())[0]?.bookedCents).toBe(4_000);
    expect(listVariableCosts("2026-06", context(), db())[0]?.bookedCents).toBe(7_000);
  });

  it("corrects the row in place when the start does not move", () => {
    const id = createVariableCost(
      {
        scope: "private",
        memberId: alex,
        label: "Lebensmittel",
        mode: "plan",
        plannedCents: 30_000,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );

    updateVariableCost(
      id,
      {
        scope: "private",
        memberId: alex,
        label: "Lebensmittel",
        mode: "plan",
        plannedCents: 28_000,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );

    const costs = listVariableCosts("2026-03", context(), db());
    expect(costs).toHaveLength(1);
    expect(costs[0]?.plannedCents).toBe(28_000);
  });
});

describe("removal", () => {
  it("retires rather than deletes, so it can come back", () => {
    const id = createVariableCost(
      {
        scope: "private",
        memberId: alex,
        label: "Tanken",
        mode: "plan",
        plannedCents: 8_000,
        validFrom: "2026-01",
        validUntil: null,
      },
      db(),
    );

    retireVariableCost(id, db());
    expect(listVariableCosts("2026-03", context(), db())).toHaveLength(0);

    restoreVariableCost(id, db());
    expect(listVariableCosts("2026-03", context(), db())).toHaveLength(1);
  });
});
