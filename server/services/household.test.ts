import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb } from "@/db/client";
import * as schema from "@/db/schema";
import { completeOnboarding, isOnboardingDone } from "./household";

const handle = createDb(":memory:");

afterEach(() => {
  handle.db.delete(schema.income).run();
  handle.db.delete(schema.member).run();
  handle.db
    .update(schema.household)
    .set({ onboardingDone: false })
    .where(eq(schema.household.id, 1))
    .run();
});

describe("onboarding", () => {
  it("starts incomplete and creates members with optional income atomically", () => {
    expect(isOnboardingDone(handle.db)).toBe(false);

    const ids = completeOnboarding(
      [
        {
          name: "Alex",
          colorIndex: 1,
          income: {
            label: "Gehalt",
            kind: "salary",
            amountCents: 205_000,
            intervalMonths: 1,
          },
        },
        { name: "Robin", colorIndex: 2 },
      ],
      handle.db,
    );

    expect(ids).toHaveLength(2);
    expect(isOnboardingDone(handle.db)).toBe(true);
    expect(handle.db.select().from(schema.income).all()).toEqual([
      expect.objectContaining({
        memberId: ids[0],
        amountCents: 205_000,
        intervalMonths: 1,
      }),
    ]);
  });

  it("rejects an empty household without marking onboarding complete", () => {
    expect(() => completeOnboarding([], handle.db)).toThrow(
      "Onboarding requires at least one member.",
    );
    expect(isOnboardingDone(handle.db)).toBe(false);
  });
});
