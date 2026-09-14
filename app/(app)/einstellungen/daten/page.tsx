import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { getEnv } from "@/lib/env";
import { listBackups } from "@/server/backups/automatic";
import { getMessages } from "@/server/i18n";
import { DataBackup } from "../data-backup";
import { SettingsHeader } from "../settings-header";

export function generateMetadata(): Metadata {
  return { title: getMessages().sections.settings.groups.data.title };
}

export default function DataSettingsPage() {
  const t = getMessages();
  const copy = t.sections.settings;
  const env = getEnv();

  return (
    <>
      <SettingsHeader title={copy.groups.data.title} subtitle={copy.groups.data.hint} />

      <Card>
        <DataBackup
          automatic={
            env.backups
              ? {
                  directory: env.backups.directory,
                  keep: env.backups.keep,
                  backups: listBackups(env.backups.directory).map((backup) => ({
                    name: backup.name,
                    takenAt: backup.takenAt.toISOString(),
                    bytes: backup.bytes,
                  })),
                }
              : null
          }
        />
      </Card>
    </>
  );
}
