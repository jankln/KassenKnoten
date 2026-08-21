import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import { listMembersWithIncome, nextFreeColorIndex } from "@/server/services/members";
import { MemberCard } from "./member-card";
import { MemberDialog } from "./member-dialog";

export const metadata: Metadata = { title: de.sections.household.title };

export default async function HouseholdPage() {
  const copy = de.sections.household;
  const members = await listMembersWithIncome();
  const total = members.reduce((sum, member) => sum + member.monthlyIncomeCents, 0);

  return (
    <>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          members.length > 0 ? (
            <MemberDialog
              defaultColorIndex={nextFreeColorIndex()}
              trigger={
                <Button variant="primary">
                  <Plus className="size-4" aria-hidden />
                  <span className="hidden sm:inline">{copy.addMember}</span>
                </Button>
              }
            />
          ) : undefined
        }
      />

      {members.length === 0 ? (
        <EmptyState
          title={copy.empty.title}
          body={copy.empty.body}
          action={
            <MemberDialog
              defaultColorIndex={1}
              trigger={<Button variant="primary">{copy.empty.action}</Button>}
            />
          }
        />
      ) : (
        <div className="space-y-4">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}

          <div className="border-line flex items-center justify-between border-t px-5 pt-4">
            <span className="text-ink-muted text-sm font-medium">{copy.total}</span>
            <span className="font-ledger tabular text-lg font-semibold">
              {formatCents(total)}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
