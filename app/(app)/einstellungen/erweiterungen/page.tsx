import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { loadExtensions } from "@/server/extensions/runtime";
import { extensionsEnabled } from "@/server/extensions/store";
import { getMessages } from "@/server/i18n";
import { Extensions } from "../extensions";
import { SettingsHeader } from "../settings-header";

export function generateMetadata(): Metadata {
  return { title: getMessages().sections.settings.groups.extensions.title };
}

export default async function ExtensionSettingsPage() {
  const t = getMessages();
  const extensions = await loadExtensions();

  return (
    <>
      <SettingsHeader
        title={t.sections.settings.groups.extensions.title}
        subtitle={t.extensions.hint}
      />

      <Card>
        <Extensions installed={extensions.installed} enabled={extensionsEnabled()} />
      </Card>
    </>
  );
}
