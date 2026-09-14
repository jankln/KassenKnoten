"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useMessages } from "@/components/providers/messages-provider";
import { cn } from "@/lib/utils";
import { SETTINGS_PATH, settingsHref, settingsSections } from "./settings-sections";

/**
 * The category list beside a settings page on a wide screen.
 *
 * Not on the overview, which is that list already, and not on a phone, where there is no
 * room beside anything — there a category page leads back to the overview instead
 * (`SettingsBack`).
 */
export function SettingsSidebar() {
  const t = useMessages();
  const pathname = usePathname();
  if (pathname === SETTINGS_PATH) {
    return null;
  }

  return (
    <nav aria-label={t.sections.settings.title} className="hidden lg:block">
      <ul className="sticky top-20 flex flex-col gap-0.5">
        {settingsSections(t).map((section) => {
          const href = settingsHref(section.slug);
          const current = pathname === href;
          return (
            <li key={section.slug}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "rounded-control flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                  current
                    ? "bg-surface-muted text-ink"
                    : "text-ink-muted hover:text-ink hover:bg-surface-muted/60",
                )}
              >
                <section.icon className="size-[18px]" aria-hidden />
                {section.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The way back to the overview from a category, on a phone. */
export function SettingsBack() {
  const t = useMessages();
  return (
    <Link
      href={SETTINGS_PATH}
      className="text-ink-muted hover:text-ink mb-3 -ml-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium lg:hidden"
    >
      <ChevronLeft className="size-4" aria-hidden />
      {t.sections.settings.title}
    </Link>
  );
}
