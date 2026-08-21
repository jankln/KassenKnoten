import type { Metadata } from "next";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { de } from "@/lib/i18n/de";
import { listCategories } from "@/server/services/categories";
import { CategoryList } from "./category-list";

export const metadata: Metadata = { title: de.sections.settings.title };

export default async function SettingsPage() {
  const copy = de.sections.settings;
  const categories = listCategories();

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
