"use client";

import { useTransition } from "react";
import { useMessages } from "@/components/providers/messages-provider";
import { LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { changeLanguage } from "./actions";

/**
 * The interface language, as a segmented control.
 *
 * Each option is written in its own language and never translated: somebody who opened
 * an instance in a language they cannot read has to be able to find their way out of it,
 * and "German" is no help to a reader who only recognises "Deutsch".
 */
export function LanguagePicker({ current }: { current: Locale }) {
  const t = useMessages();
  const [pending, startTransition] = useTransition();

  return (
    <div className="border-line bg-surface-muted grid grid-cols-2 gap-1 rounded-full border p-1">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          aria-pressed={current === locale}
          disabled={pending}
          onClick={() => startTransition(() => void changeLanguage(locale))}
          className={cn(
            "min-h-11 rounded-full px-3 text-sm font-medium transition-colors sm:min-h-9",
            current === locale ? "bg-surface text-ink shadow-sm" : "text-ink-muted",
          )}
        >
          {t.languages[locale]}
        </button>
      ))}
    </div>
  );
}
