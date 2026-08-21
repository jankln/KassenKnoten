import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { buttonStyles } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import { listCategories } from "@/server/services/categories";
import { listPrivateExpenses } from "@/server/services/expenses";
import { MemberExpenseCard } from "./expense-list";

export const metadata: Metadata = { title: de.sections.fixedCosts.title };

export default async function FixedCostsPage() {
  const copy = de.sections.fixedCosts;
  const groups = listPrivateExpenses();
  const categories = listCategories();
  const members = groups.map((group) => ({ id: group.memberId, name: group.name }));
  const total = groups.reduce((sum, group) => sum + group.monthlyCents, 0);

  // Fixed costs always belong to someone, so there is nothing to do here first.
  if (groups.length === 0) {
    return (
      <>
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
        <EmptyState
          title={copy.noMembers.title}
          body={copy.noMembers.body}
          action={
            <Link href="/haushalt" className={buttonStyles({ variant: "primary" })}>
              {copy.noMembers.action}
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <div className="space-y-4">
        {groups.map((group) => (
          <MemberExpenseCard
            key={group.memberId}
            group={group}
            members={members}
            categories={categories}
          />
        ))}

        <div className="border-line flex items-center justify-between border-t px-5 pt-4">
          <span className="text-ink-muted text-sm font-medium">
            {copy.privateTotal}
          </span>
          <span className="font-ledger tabular text-lg font-semibold">
            {formatCents(total)}
          </span>
        </div>
      </div>
    </>
  );
}
