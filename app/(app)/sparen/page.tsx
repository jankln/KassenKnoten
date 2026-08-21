import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Button } from "@/components/ui/button";
import { de } from "@/lib/i18n/de";
import { listMembersWithIncome } from "@/server/services/members";
import { listSavingsPots } from "@/server/services/savings";
import { SavingsList } from "./savings-list";
import { SavingsPotDialog } from "./savings-pot-dialog";

export const metadata: Metadata = { title: de.sections.savings.title };

export default async function SavingsPage() {
  const copy = de.sections.savings;
  const [pots, members] = await Promise.all([
    listSavingsPots(),
    listMembersWithIncome(),
  ]);
  const ownerOptions = members.map((member) => ({
    id: member.id,
    name: member.name,
  }));

  return (
    <>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          pots.length > 0 ? (
            <SavingsPotDialog
              members={ownerOptions}
              trigger={
                <Button variant="primary">
                  <Plus className="size-4" aria-hidden />
                  <span className="hidden sm:inline">{copy.addPot}</span>
                </Button>
              }
            />
          ) : undefined
        }
      />

      {pots.length === 0 ? (
        <EmptyState
          title={copy.empty.title}
          body={copy.empty.body}
          action={
            <SavingsPotDialog
              members={ownerOptions}
              trigger={<Button variant="primary">{copy.empty.action}</Button>}
            />
          }
        />
      ) : (
        <SavingsList pots={pots} members={ownerOptions} />
      )}
    </>
  );
}
