import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { getMessages } from "@/server/i18n";
import { settingsHref, settingsSections } from "./settings-sections";

// A page title is copy like any other, so it is resolved per request rather than
// frozen into a module constant at import time.
export function generateMetadata(): Metadata {
  const t = getMessages();
  return { title: t.sections.settings.title };
}

/**
 * The settings overview: what can be changed, grouped, one line each. It loads nothing —
 * every category page fetches only what it shows.
 */
export default function SettingsOverviewPage() {
  const t = getMessages();
  const copy = t.sections.settings;

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <ul className="border-line bg-surface divide-line rounded-card divide-y border">
        {settingsSections(t).map((section) => (
          <li key={section.slug}>
            <Link
              href={settingsHref(section.slug)}
              className="hover:bg-surface-muted/60 flex min-h-16 items-center gap-4 px-5 py-3.5 transition-colors first:rounded-t-[inherit] last:rounded-b-[inherit]"
            >
              <span className="bg-surface-muted text-ink rounded-control flex size-10 shrink-0 items-center justify-center">
                <section.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{section.title}</span>
                <span className="text-ink-muted mt-0.5 block text-sm">
                  {section.hint}
                </span>
              </span>
              <ChevronRight className="text-ink-muted size-4 shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
