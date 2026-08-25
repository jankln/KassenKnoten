import type { Metadata } from "next";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { listCategories } from "@/server/services/categories";
import { getHouseholdSettings, getSplitContext } from "@/server/services/household";
import { listMembersWithIncome } from "@/server/services/members";
import { CategoryList } from "./category-list";
import { DataBackup } from "./data-backup";
import { DefaultSplitForm } from "./default-split";
import { InstallApp } from "./install-app";
import { LanguagePicker } from "./language-picker";
import { getLocale, getMessages } from "@/server/i18n";

// A page title is copy like any other, so it is resolved per request rather than
// frozen into a module constant at import time.
export function generateMetadata(): Metadata {
  const t = getMessages();
  return { title: t.sections.settings.title };
}

export default async function SettingsPage() {
  const t = getMessages();
  const copy = t.sections.settings;
  const categories = listCategories();
  const members = await listMembersWithIncome();
  const settings = getHouseholdSettings();
  const context = await getSplitContext();

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

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

        {members.length > 0 ? (
          <Card>
            <div className="mb-4">
              <CardTitle>{t.sections.fixedCosts.defaultSplit}</CardTitle>
              <p className="text-ink-muted mt-1 text-sm">
                {t.sections.fixedCosts.defaultSplitHint}
              </p>
            </div>
            <DefaultSplitForm
              members={members.map((member) => ({
                id: member.id,
                name: member.name,
                colorIndex: member.colorIndex,
              }))}
              defaultMode={settings.defaultSplitMode}
              defaultShares={context.defaultShares}
            />
          </Card>
        ) : null}

        <Card>
          <div className="mb-4">
            <CardTitle>{copy.dataTitle}</CardTitle>
            <p className="text-ink-muted mt-1 text-sm">{copy.dataHint}</p>
          </div>
          <DataBackup />
        </Card>

        <Card>
          <div className="mb-4">
            <CardTitle>{t.install.title}</CardTitle>
            <p className="text-ink-muted mt-1 text-sm">{t.install.hint}</p>
          </div>
          <InstallApp />
        </Card>

        <Card>
          <div className="mb-4">
            <CardTitle>{copy.categories}</CardTitle>
            <p className="text-ink-muted mt-1 text-sm">{copy.categoriesHint}</p>
          </div>
          <CategoryList categories={categories} />
        </Card>
      </div>
    </>
  );
}
