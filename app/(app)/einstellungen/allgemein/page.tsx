import type { Metadata } from "next";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { Card, CardTitle } from "@/components/ui/card";
import { getLocale, getMessages } from "@/server/i18n";
import { InstallApp } from "../install-app";
import { LanguagePicker } from "../language-picker";
import { SettingsHeader } from "../settings-header";

export function generateMetadata(): Metadata {
  return { title: getMessages().sections.settings.groups.general.title };
}

export default function GeneralSettingsPage() {
  const t = getMessages();
  const copy = t.sections.settings;

  return (
    <>
      <SettingsHeader
        title={copy.groups.general.title}
        subtitle={copy.groups.general.hint}
      />

      <div className="space-y-4">
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>{t.language.label}</CardTitle>
            <p className="text-ink-muted mt-1 text-sm">{t.language.hint}</p>
          </div>
          <LanguagePicker current={getLocale()} />
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>{t.theme.label}</CardTitle>
            <p className="text-ink-muted mt-1 text-sm">{copy.themeHint}</p>
          </div>
          <ThemeToggle />
        </Card>

        <Card>
          <div className="mb-4">
            <CardTitle>{t.install.title}</CardTitle>
            <p className="text-ink-muted mt-1 text-sm">{t.install.hint}</p>
          </div>
          <InstallApp />
        </Card>
      </div>
    </>
  );
}
