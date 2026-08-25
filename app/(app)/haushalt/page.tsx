import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import { listMembersWithIncome, nextFreeColorIndex } from "@/server/services/members";
import { MemberCard } from "./member-card";
import { MemberDialog } from "./member-dialog";
import { getMessages } from "@/server/i18n";

// A page title is copy like any other, so it is resolved per request rather than
// frozen into a module constant at import time.
export function generateMetadata(): Metadata {
  const t = getMessages();
  return { title: t.sections.household.title };
}

export default async function HouseholdPage() {
  const t = getMessages();
  const copy = t.sections.household;
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
