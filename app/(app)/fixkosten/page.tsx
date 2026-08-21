import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { buttonStyles } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import { listCategories } from "@/server/services/categories";
import { listPrivateExpenses, listSharedExpenses } from "@/server/services/expenses";
import { getHouseholdSettings, getSplitContext } from "@/server/services/household";
import { listMembersWithIncome } from "@/server/services/members";
import { MemberExpenseCard } from "./expense-list";
import { Segments } from "./segments";
import { SharedExpenseList } from "./shared-list";
import { SharedExpenseDialog } from "./shared-dialog";

export const metadata: Metadata = { title: de.sections.fixedCosts.title };

export default async function FixedCostsPage(props: PageProps<"/fixkosten">) {
  const copy = de.sections.fixedCosts;
  const { bereich } = await props.searchParams;
  const current = bereich === "gemeinsam" ? "shared" : "private";

  const [membersWithIncome, context] = await Promise.all([
    listMembersWithIncome(),
    getSplitContext(),
  ]);
  const settings = getHouseholdSettings();
  const categories = listCategories();
  const groups = listPrivateExpenses();
  const shared = listSharedExpenses(context);

  const splitMembers = membersWithIncome.map((member) => ({
    id: member.id,
    name: member.name,
    colorIndex: member.colorIndex,
    monthlyIncomeCents: member.monthlyIncomeCents,
  }));

  const privateTotal = groups.reduce((sum, group) => sum + group.monthlyCents, 0);
  const sharedTotal = shared.reduce((sum, expense) => sum + expense.monthlyCents, 0);

  // Fixed costs always belong to someone, so there is nothing to do here first.
  if (membersWithIncome.length === 0) {
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
      <Segments
        current={current}
        labels={{ private: copy.private, shared: copy.shared }}
      />

      {current === "private" ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <MemberExpenseCard
              key={group.memberId}
              group={group}
              members={groups.map((entry) => ({
                id: entry.memberId,
                name: entry.name,
              }))}
              categories={categories}
            />
          ))}
          <TotalRow label={copy.privateTotal} cents={privateTotal} />
        </div>
      ) : shared.length === 0 ? (
        <EmptyState
          title={copy.sharedEmpty.title}
          body={copy.sharedEmpty.body}
          action={
            <SharedExpenseDialog
              members={splitMembers}
              categories={categories}
              defaultMode={settings.defaultSplitMode}
              defaultShares={context.defaultShares}
              trigger={
                <button type="button" className={buttonStyles({ variant: "primary" })}>
                  {copy.sharedEmpty.action}
                </button>
              }
            />
          }
        />
      ) : (
        <div className="space-y-4">
          <SharedExpenseList
            expenses={shared}
            members={splitMembers}
            categories={categories}
            defaultMode={settings.defaultSplitMode}
            defaultShares={context.defaultShares}
          />
          <TotalRow label={copy.sharedTotal} cents={sharedTotal} />
        </div>
      )}

      <div className="border-line mt-8 flex items-center justify-between border-t px-5 pt-4">
        <span className="text-sm font-medium">{copy.grandTotal}</span>
        <span className="font-ledger tabular text-lg font-semibold">
          {formatCents(privateTotal + sharedTotal)}
        </span>
      </div>
    </>
  );
}

function TotalRow({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex items-center justify-between px-5">
      <span className="text-ink-muted text-sm">{label}</span>
      <span className="font-ledger tabular text-sm font-medium">
        {formatCents(cents)}
      </span>
    </div>
  );
}
