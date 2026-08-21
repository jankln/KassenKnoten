import type { Metadata } from "next";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { de } from "@/lib/i18n/de";

export const metadata: Metadata = { title: de.sections.settings.title };

export default function SettingsPage() {
  const copy = de.sections.settings;

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <div className="space-y-4">
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>{de.theme.label}</CardTitle>
            <p className="text-ink-muted mt-1 text-sm">{copy.themeHint}</p>
          </div>
          <ThemeToggle />
        </Card>

        <Card>
          <CardTitle>{de.underConstruction.title}</CardTitle>
          <p className="text-ink-muted mt-2 text-sm">{de.underConstruction.body}</p>
        </Card>
      </div>
    </>
  );
}
