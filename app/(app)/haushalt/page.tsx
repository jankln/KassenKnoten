import type { Metadata } from "next";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { de } from "@/lib/i18n/de";

export const metadata: Metadata = { title: de.sections.household.title };

export default function HouseholdPage() {
  const copy = de.sections.household;

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      <EmptyState title={copy.empty.title} body={copy.empty.body} />
    </>
  );
}
