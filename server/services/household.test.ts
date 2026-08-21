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
  it("starts incomplete and creates members with multiple optional incomes atomically", () => {
    expect(isOnboardingDone(handle.db)).toBe(false);

    const ids = completeOnboarding(
      [
        {
          name: "Alex",
          colorIndex: 1,
          incomes: [
            {
              label: "Gehalt",
              kind: "salary",
              amountCents: 205_000,
              intervalMonths: 1,
            },
            {
              label: "Nebenjob",
              kind: "other",
              amountCents: 45_000,
              intervalMonths: 3,
            },
          ],
        },
        { name: "Robin", colorIndex: 2, incomes: [] },
      ],
      handle.db,
    );

    expect(ids).toHaveLength(2);
    expect(isOnboardingDone(handle.db)).toBe(true);
    expect(handle.db.select().from(schema.income).all()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberId: ids[0],
          label: "Gehalt",
          amountCents: 205_000,
          intervalMonths: 1,
        }),
        expect.objectContaining({
          memberId: ids[0],
          label: "Nebenjob",
          amountCents: 45_000,
          intervalMonths: 3,
        }),
      ]),
    );
    expect(handle.db.select().from(schema.income).all()).toHaveLength(2);
  });

  it("rejects an empty household without marking onboarding complete", () => {
    expect(() => completeOnboarding([], handle.db)).toThrow(
      "Onboarding requires at least one member.",
    );
    expect(isOnboardingDone(handle.db)).toBe(false);
  });

  it("rolls back members and incomes when an income insert fails", () => {
    expect(() =>
      completeOnboarding(
        [
          {
            name: "Alex",
            colorIndex: 1,
            incomes: [
              {
                label: "Gehalt",
                kind: "salary",
                amountCents: 205_000,
                intervalMonths: 1,
              },
              {
                label: "Ungültig",
                kind: "other",
                amountCents: -1,
                intervalMonths: 1,
              },
            ],
          },
        ],
        handle.db,
      ),
    ).toThrow();

    expect(handle.db.select().from(schema.member).all()).toHaveLength(0);
    expect(handle.db.select().from(schema.income).all()).toHaveLength(0);
    expect(isOnboardingDone(handle.db)).toBe(false);
  });
});
