import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";
import { MonthNav } from "@/components/patterns/month-nav";
import { PageHeader } from "@/components/patterns/page-header";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isPeriod, periodFromDate, type Period } from "@/lib/domain/period";
import { formatCents } from "@/lib/format";
import { listCategories } from "@/server/services/categories";
import { getHouseholdSettings, getSplitContext } from "@/server/services/household";
import { listMembersWithIncome } from "@/server/services/members";
import {
  groupPrivateByMember,
  listVariableCosts,
} from "@/server/services/variable-costs";
import { CostCard } from "./cost-card";
import { VariableCostDialog } from "./cost-dialog";
import { ReceiptScan, type ScanTarget } from "./receipt-scan";
import { Segments } from "./segments";
import { getMessages } from "@/server/i18n";

// A page title is copy like any other, so it is resolved per request rather than
// frozen into a module constant at import time.
export function generateMetadata(): Metadata {
  const t = getMessages();
  return { title: t.sections.variableCosts.title };
}

/**
 * Variable costs, one month at a time.
 *
 * The month is in the URL rather than in component state, for the same reason it is on
 * the dashboard: it survives a reload and can be linked to. It matters more here — in
 * `detailed` mode the figures on this screen *are* the month, so a screen that quietly
 * showed a different one than the header claims would be reporting the wrong money.
 */
export default async function VariableCostsPage(props: PageProps<"/variable-kosten">) {
  const t = getMessages();
  const copy = t.sections.variableCosts;
  const scanCopy = t.sections.receipt;
  const { bereich, monat, scan } = await props.searchParams;
  const today = periodFromDate(new Date());
  const period: Period = typeof monat === "string" && isPeriod(monat) ? monat : today;
  const current = bereich === "gemeinsam" ? "shared" : "private";

  const [membersWithIncome, context] = await Promise.all([
    listMembersWithIncome(),
    getSplitContext(),
  ]);
  const settings = getHouseholdSettings();
  const categories = listCategories();
  const costs = listVariableCosts(period, context);

  const splitMembers = membersWithIncome.map((member) => ({
    id: member.id,
    name: member.name,
    colorIndex: member.colorIndex,
    monthlyIncomeCents: member.monthlyIncomeCents,
  }));
  const members = membersWithIncome.map((member) => ({
    id: member.id,
    name: member.name,
  }));

  const groups = groupPrivateByMember(costs, splitMembers);
  const shared = costs.filter((cost) => cost.scope === "shared");
  const privateTotal = groups.reduce((sum, group) => sum + group.countedCents, 0);
  const sharedTotal = shared.reduce((sum, cost) => sum + cost.countedCents, 0);

  const hrefFor = (target: Period) =>
    current === "shared"
      ? `/variable-kosten?monat=${target}&bereich=gemeinsam`
      : `/variable-kosten?monat=${target}`;

  // Variable costs always belong to someone, so there is nothing to do here first.
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

  const dialogProps = {
    members,
    splitMembers,
    categories,
    defaultMode: settings.defaultSplitMode,
    defaultShares: context.defaultShares,
    defaultFrom: period,
  };

  const memberNames = new Map(members.map((member) => [member.id, member.name]));

  /**
   * What a scanned receipt can be booked against, most recently used first.
   *
   * An order, not a guess: the budget somebody entered a receipt against yesterday is
   * the one the next receipt most likely belongs to, and a budget with no receipts at
   * all cannot be that. Nothing here pre-selects anything — `docs/PLAN.md` keeps every
   * decision that reaches a split in the household's hands, and the budget decides the
   * split.
   */
  const scanTargets: ScanTarget[] = costs
    .map((cost) => ({
      cost,
      lastBooking: cost.bookings.reduce(
        (latest, booking) => (booking.bookedOn > latest ? booking.bookedOn : latest),
        "",
      ),
    }))
    .sort(
      (a, b) =>
        b.lastBooking.localeCompare(a.lastBooking) ||
        a.cost.label.localeCompare(b.cost.label),
    )
    .map(({ cost }) => ({
      id: cost.id,
      label: cost.label,
      scope: cost.scope,
      detailed: cost.mode === "detailed",
      memberName:
        cost.memberId === null ? null : (memberNames.get(cost.memberId) ?? null),
    }));

  /**
   * Somebody asked to scan — from the launcher shortcut — and this month has nothing to
   * book a receipt onto.
   *
   * Keyed on the scan targets rather than on the segment being empty: the shared segment
   * can be empty while two private budgets sit one tab away, and scanning is perfectly
   * possible then. The generic empty state would answer a question nobody asked, which
   * is how a shortcut ends up promising something the screen does not have.
   */
  const needsItemToScan = scan === "1" && scanTargets.length === 0;

  return (
    <>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          scanTargets.length > 0 ? (
            <ReceiptScan
              targets={scanTargets}
              period={period}
              autoOpen={scan === "1"}
            />
          ) : null
        }
      />
      <MonthNav period={period} today={today} hrefFor={hrefFor} />
      <Segments
        current={current}
        period={period}
        labels={{ private: copy.private, shared: copy.shared }}
      />

      {/* A first-run screen that only offers "Posten anlegen" twice teaches nothing about
          what a variable cost is or why it has two modes. Once anything exists, the
          per-person cards are the better view and this disappears. */}
      {current === "private" && costs.length === 0 ? (
        <EmptyState
          title={needsItemToScan ? scanCopy.needsItemTitle : copy.empty.title}
          body={needsItemToScan ? scanCopy.needsItem : copy.empty.body}
          action={
            <VariableCostDialog
              scope="private"
              memberId={groups[0]?.memberId}
              {...dialogProps}
              trigger={
                <button type="button" className={buttonStyles({ variant: "primary" })}>
                  {copy.empty.action}
                </button>
              }
            />
          }
        />
      ) : current === "private" ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.memberId} aria-labelledby={`member-${group.memberId}`}>
              <header className="mb-2 flex items-center gap-3 px-1">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: `var(--color-member-${group.colorIndex})`,
                  }}
                />
                <h2
                  id={`member-${group.memberId}`}
                  className="font-display truncate text-lg font-semibold tracking-tight"
                >
                  {group.name}
                </h2>
                <span className="font-ledger tabular ml-auto text-base font-medium">
                  {formatCents(group.countedCents)}
                </span>
              </header>

              <div className="space-y-3">
                {group.costs.map((cost) => (
                  <CostCard
                    key={cost.id}
                    cost={cost}
                    period={period}
                    {...dialogProps}
                  />
                ))}
                <Card className="p-2">
                  <VariableCostDialog
                    scope="private"
                    memberId={group.memberId}
                    {...dialogProps}
                    trigger={
                      <Button variant="ghost" size="sm">
                        <Plus className="size-4" aria-hidden />
                        {copy.addCost}
                      </Button>
                    }
                  />
                </Card>
              </div>
            </section>
          ))}
          <TotalRow label={copy.privateTotal} cents={privateTotal} />
        </div>
      ) : shared.length === 0 ? (
        <EmptyState
          title={needsItemToScan ? scanCopy.needsItemTitle : copy.sharedEmpty.title}
          body={needsItemToScan ? scanCopy.needsItem : copy.sharedEmpty.body}
          action={
            <VariableCostDialog
              scope="shared"
              {...dialogProps}
              trigger={
                <button type="button" className={buttonStyles({ variant: "primary" })}>
                  {copy.sharedEmpty.action}
                </button>
              }
            />
          }
        />
      ) : (
        <div className="space-y-3">
          {shared.map((cost) => (
            <CostCard key={cost.id} cost={cost} period={period} {...dialogProps} />
          ))}
          <Card className="p-2">
            <VariableCostDialog
              scope="shared"
              {...dialogProps}
              trigger={
                <Button variant="ghost" size="sm">
                  <Plus className="size-4" aria-hidden />
                  {copy.addCost}
                </Button>
              }
            />
          </Card>
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
