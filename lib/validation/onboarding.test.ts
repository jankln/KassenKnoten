import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { onboardingInput } from "./onboarding";

describe("onboarding validation", () => {
  it("accepts multiple incomes and members without incomes", () => {
    const result = onboardingInput(en).safeParse([
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
      { name: "Robin", colorIndex: 2 },
    ]);

    expect(result.success).toBe(true);
  });

  it("keeps income optional but validates every provided source", () => {
    const result = onboardingInput(en).safeParse([
      {
        name: "Alex",
        colorIndex: 1,
        incomes: [
          {
            label: "",
            kind: "salary",
            amountCents: 205_000,
            intervalMonths: 1,
          },
        ],
      },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Please enter a label.");
    }
  });
});
