"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: de.theme.light, icon: Sun },
  { value: "dark", label: de.theme.dark, icon: Moon },
  { value: "system", label: de.theme.system, icon: Monitor },
] as const;

/**
 * A three-way segmented control rather than a toggle, because "system" is a real choice
 * and a two-state switch cannot express it.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // The server cannot know the chosen theme, so nothing may render as selected until
  // hydration. useSyncExternalStore gives that as a plain server/client snapshot
  // difference — no effect, no state, no hydration mismatch.
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  return (
    <div
      role="group"
      aria-label={de.theme.label}
      className="border-line bg-surface-muted inline-flex rounded-full border p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-label={option.label}
            aria-pressed={active}
            className={cn(
              "rounded-full p-1.5 transition-colors",
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-muted hover:text-ink",
            )}
          >
            <option.icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/** The hydration flag never changes after mount, so there is nothing to subscribe to. */
function subscribeToNothing(): () => void {
  return () => {};
}
