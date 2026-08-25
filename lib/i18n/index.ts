import { de } from "./de";
import { en, type Messages } from "./en";

/**
 * The languages the interface speaks.
 *
 * English first, and English is the default: a self-hosted project handed to strangers
 * should open in the language most of them can read. German is one click away and stays
 * the language the product was designed in.
 */
export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

const sets: Record<Locale, Messages> = { en, de };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The messages for a locale, falling back to English for anything unrecognised. */
export function messagesFor(locale: string | null | undefined): Messages {
  return isLocale(locale) ? sets[locale] : sets[DEFAULT_LOCALE];
}

export type { Messages };
