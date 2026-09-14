import { PageHeader } from "@/components/patterns/page-header";
import { SettingsBack } from "./settings-nav";

/** The top of a category page: the way back on a phone, then the usual page header. */
export function SettingsHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <SettingsBack />
      <PageHeader title={title} subtitle={subtitle} />
    </>
  );
}
