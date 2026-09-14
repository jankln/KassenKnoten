import type { Metadata } from "next";
import { Card, CardTitle } from "@/components/ui/card";
import { getMessages } from "@/server/i18n";
import { listCategories } from "@/server/services/categories";
import { getHouseholdSettings, getSplitContext } from "@/server/services/household";
import { listMembersWithIncome } from "@/server/services/members";
import { CategoryList } from "../category-list";
import { DefaultSplitForm } from "../default-split";
import { SettingsHeader } from "../settings-header";

export function generateMetadata(): Metadata {
  return { title: getMessages().sections.settings.groups.planning.title };
}

export default async function PlanningSettingsPage() {
  const t = getMessages();
  const copy = t.sections.settings;
  const categories = listCategories();
  const members = await listMembersWithIncome();
  const settings = getHouseholdSettings();
  const context = await getSplitContext();

  return (
    <>
      <SettingsHeader
        title={copy.groups.planning.title}
        subtitle={copy.groups.planning.hint}
      />

      <div className="space-y-4">
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
            <CardTitle>{copy.categories}</CardTitle>
            <p className="text-ink-muted mt-1 text-sm">{copy.categoriesHint}</p>
          </div>
          <CategoryList categories={categories} />
        </Card>
      </div>
    </>
  );
}
