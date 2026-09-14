import { describe, expect, it } from "vitest";
import { de } from "@/lib/i18n/de";
import { en } from "@/lib/i18n/en";
import { settingsHref, settingsSections } from "./settings-sections";

describe("settingsSections", () => {
  it("lists five categories with unique slugs, titled in both languages", () => {
    const english = settingsSections(en);
    const german = settingsSections(de);

    expect(english.map((section) => section.slug)).toEqual([
      "allgemein",
      "planung",
      "anmeldung",
      "daten",
      "erweiterungen",
    ]);
    expect(new Set(english.map((section) => section.slug)).size).toBe(english.length);
    for (const section of [...english, ...german]) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.hint.length).toBeGreaterThan(0);
    }
  });

  it("links every category below the settings path", () => {
    expect(settingsHref("daten")).toBe("/einstellungen/daten");
  });
});
