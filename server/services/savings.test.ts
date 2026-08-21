import { afterEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  createSavingsPot,
  listSavingsPots,
  restoreSavingsPot,
  retireSavingsPot,
  updateSavingsPot,
} from "./savings";

const handle = createDb(":memory:");

afterEach(() => {
  handle.db.delete(schema.savingsPot).run();
  handle.db.delete(schema.member).run();
});

function member(name: string) {
  return handle.db
    .insert(schema.member)
    .values({ name })
    .returning({ id: schema.member.id })
    .get().id;
}

describe("savings pots", () => {
  it("creates and lists a household pot with capped progress", () => {
    const id = createSavingsPot(
      {
        name: "Notgroschen",
        ownerMemberId: null,
        monthlyRateCents: 25_000,
        balanceCents: 125_000,
        targetCents: 100_000,
        note: "Für unerwartete Ausgaben",
      },
      handle.db,
    );

    expect(listSavingsPots(handle.db)).toEqual([
      expect.objectContaining({
        id,
        ownerName: null,
        monthlyRateCents: 25_000,
        balanceCents: 125_000,
        progressBp: 10_000,
        overTarget: true,
      }),
    ]);
  });

  it("resolves an active member owner and updates all money fields", () => {
    const ownerMemberId = member("Alex");
    const id = createSavingsPot(
      {
        name: "Urlaub",
        ownerMemberId,
        monthlyRateCents: 10_000,
        balanceCents: 20_000,
        targetCents: null,
        note: null,
      },
      handle.db,
    );

    updateSavingsPot(
      id,
      {
        name: "Urlaub neu",
        ownerMemberId,
        monthlyRateCents: 12_345,
        balanceCents: 67_890,
        targetCents: 100_000,
        note: "Sommer",
      },
      handle.db,
    );

    expect(listSavingsPots(handle.db)[0]).toMatchObject({
      name: "Urlaub neu",
      ownerName: "Alex",
      monthlyRateCents: 12_345,
      balanceCents: 67_890,
      targetCents: 100_000,
      progressBp: 6789,
      overTarget: false,
      note: "Sommer",
    });
  });

  it("retires a pot without deleting it and restores it", () => {
    const id = createSavingsPot(
      {
        name: "Reserve",
        ownerMemberId: null,
        monthlyRateCents: 0,
        balanceCents: 0,
        targetCents: null,
        note: null,
      },
      handle.db,
    );

    retireSavingsPot(id, handle.db);
    expect(listSavingsPots(handle.db)).toEqual([]);

    restoreSavingsPot(id, handle.db);
    expect(listSavingsPots(handle.db)[0]?.name).toBe("Reserve");
    expect(handle.db.select().from(schema.savingsPot).all()).toHaveLength(1);
  });
});
