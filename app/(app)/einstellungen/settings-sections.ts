import {
  DatabaseBackup,
  KeyRound,
  Puzzle,
  SlidersHorizontal,
  Tags,
} from "lucide-react";
import type { Messages } from "@/lib/i18n";

/**
 * The categories of the settings, in the order they are listed.
 *
 * Grouped by what somebody comes to change, not by where the code lives: the language and
 * the theme are both "how the app looks to me", the default split and the cost categories
 * both "how we plan", and sign-in stands alone because it is the one that can lock a
 * household out. One list, read by the overview and by the desktop sidebar alike, so the
 * two can never disagree about what exists.
 */
export function settingsSections(t: Messages) {
  const copy = t.sections.settings.groups;
  return [
    { slug: "allgemein", icon: SlidersHorizontal, ...copy.general },
    { slug: "planung", icon: Tags, ...copy.planning },
    { slug: "anmeldung", icon: KeyRound, ...copy.signIn },
    { slug: "daten", icon: DatabaseBackup, ...copy.data },
    { slug: "erweiterungen", icon: Puzzle, ...copy.extensions },
  ] as const;
}

export const SETTINGS_PATH = "/einstellungen";

export function settingsHref(slug: string): string {
  return `${SETTINGS_PATH}/${slug}`;
}
