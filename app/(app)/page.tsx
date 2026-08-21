import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { de } from "@/lib/i18n/de";

export default function OverviewPage() {
  const copy = de.sections.overview;

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      <EmptyState title={copy.empty.title} body={copy.empty.body} />
    </>
  );
}
