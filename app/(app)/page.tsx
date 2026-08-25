import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";
import { MonthNav } from "@/components/patterns/month-nav";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { buttonStyles } from "@/components/ui/button";
import { formatCents, formatPeriod, formatRatio } from "@/lib/format";
import { isPeriod, periodFromDate, type Period } from "@/lib/domain/period";
import type {
  DashboardCategory,
  DashboardData,
  TrendPoint,
} from "@/server/services/dashboard";
import { getDashboardData, getTrend } from "@/server/services/dashboard";
import { getMessages } from "@/server/i18n";
import type { Messages } from "@/lib/i18n";

// A page title is copy like any other, so it is resolved per request rather than
// frozen into a module constant at import time.
export function generateMetadata(): Metadata {
  const t = getMessages();
  return { title: t.sections.overview.title };
}

export default async function OverviewPage({ searchParams }: PageProps<"/">) {
  const t = getMessages();
  const copy = t.sections.overview;
  const today = periodFromDate(new Date());
  // A malformed month in the URL falls back to today rather than erroring: the address
  // bar is user input, and there is a perfectly good month to show.
  const requested = (await searchParams).monat;
  const period =
    typeof requested === "string" && isPeriod(requested) ? requested : today;

  const dashboard = getDashboardData(period);
  const trend = getTrend(period);
  const monthHref = (target: Period) => `/?monat=${target}`;

  if (!dashboard.hasData) {
    return (
      <>
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
        <MonthNav period={period} today={today} hrefFor={monthHref} />
        <EmptyState
          title={copy.empty.title}
          body={copy.empty.body}
          action={
            <Link href="/haushalt" className={buttonStyles({ variant: "primary" })}>
              {copy.empty.action}
            </Link>
          }
        />
        <TrendSection trend={trend} />
      </>
    );
  }

  // A month before anything was entered has no plan to report. Showing zeros next to a
  // savings rate that is not dated would warn about a shortfall that never happened.
  if (!dashboard.hasEntriesInPeriod) {
    return (
      <>
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
        <MonthNav period={period} today={today} hrefFor={monthHref} />
        <EmptyState title={copy.emptyMonth.title} body={copy.emptyMonth.body} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      <MonthNav period={period} today={today} hrefFor={monthHref} />
      <Warnings dashboard={dashboard} />

      <section aria-labelledby="dashboard-kpis">
        <h2 id="dashboard-kpis" className="sr-only">
          {copy.kpi.title}
        </h2>
        {/* Five tiles: two rows of two on a phone, with free cash spanning the last row
            on its own. It is the number the household actually came for, and a lone tile
            in a two-column grid would otherwise sit next to a gap. */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi
            label={copy.kpi.income}
            value={formatCents(dashboard.summary.incomeCents)}
            hint={copy.kpi.perMonth}
          />
          <Kpi
            label={copy.kpi.fixedCosts}
            value={formatCents(dashboard.summary.fixedTotalCents)}
            hint={copy.kpi.perMonth}
          />
          <Kpi
            label={copy.kpi.variableCosts}
            value={formatCents(dashboard.summary.variableTotalCents)}
            hint={
              dashboard.summary.variableBookedCents > 0
                ? copy.kpi.bookedOfPlanned(
                    formatCents(dashboard.summary.variableBookedCents),
                    formatCents(dashboard.summary.variablePlannedCents),
                  )
                : copy.kpi.perMonth
            }
          />
          <Kpi
            label={copy.kpi.savingsRate}
            value={formatCents(dashboard.summary.savingsRateCents)}
            hint={
              dashboard.summary.incomeCents > 0
                ? copy.kpi.ofIncome(
                    formatRatio(
                      dashboard.summary.savingsRateCents /
                        dashboard.summary.incomeCents,
                    ),
                  )
                : copy.kpi.perMonth
            }
          />
          <Kpi
            label={copy.kpi.freeCash}
            value={formatCents(dashboard.summary.freeCashCents)}
            hint={copy.kpi.perMonth}
            className="col-span-2 lg:col-span-1"
            valueClassName={
              dashboard.summary.freeCashCents < 0 ? "text-negative" : "text-positive"
            }
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <PeopleSection dashboard={dashboard} />
        <CategoriesSection dashboard={dashboard} />
      </div>

      <VariableSection dashboard={dashboard} />
      <SavingsSection dashboard={dashboard} />
      <TrendSection trend={trend} />
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  hint: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <Card className={`min-w-0 p-4 sm:p-5 ${className ?? ""}`}>
      <CardTitle className="truncate">{label}</CardTitle>
      <p
        className={`font-ledger tabular mt-3 truncate text-lg font-semibold sm:text-xl ${valueClassName ?? ""}`}
      >
        {value}
      </p>
      <p className="text-ink-muted mt-1 text-xs">{hint}</p>
    </Card>
  );
}

function Warnings({ dashboard }: { dashboard: DashboardData }) {
  const t = getMessages();
  const copy = t.sections.overview.warnings;
  const warnings: { message: string; key: string }[] = [];
  if (dashboard.summary.freeCashCents < 0) {
    warnings.push({
      key: "free-cash",
      message: copy.negativeFreeCash(formatCents(-dashboard.summary.freeCashCents)),
    });
  }
  if (dashboard.summary.savingsRateCents > dashboard.summary.incomeCents) {
    warnings.push({ key: "savings-rate", message: copy.savingsAboveIncome });
  }
  for (const cost of dashboard.variableCosts) {
    if (cost.remainingCents < 0) {
      warnings.push({
        key: `budget-${cost.id}`,
        message: copy.overBudget(cost.label, formatCents(-cost.remainingCents)),
      });
    }
  }
  for (const pot of dashboard.savingsPots) {
    if (pot.overTarget) {
      warnings.push({ key: `pot-${pot.id}`, message: copy.overTarget(pot.name) });
    }
  }

  if (warnings.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="dashboard-warnings" className="mb-6 space-y-2">
      <h2 id="dashboard-warnings" className="sr-only">
        {copy.title}
      </h2>
      {warnings.map((warning) => (
        <div
          key={warning.key}
          role="status"
          className="border-warning/35 bg-warning/10 text-ink-muted rounded-control flex items-start gap-3 border px-4 py-3 text-sm"
        >
          <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{warning.message}</span>
        </div>
      ))}
    </section>
  );
}

function PeopleSection({ dashboard }: { dashboard: DashboardData }) {
  const t = getMessages();
  const copy = t.sections.overview.people;
  return (
    <section aria-labelledby="dashboard-people">
      <CardTitle id="dashboard-people" className="mb-3">
        {copy.title}
      </CardTitle>
      <div className="space-y-3">
        {dashboard.members.map((member) => (
          <Card key={member.memberId} className="p-4">
            <header className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--color-member-${member.colorIndex})` }}
              />
              <h3 className="font-display min-w-0 truncate font-semibold">
                {member.name}
              </h3>
              <span
                className={`font-ledger tabular ml-auto shrink-0 text-sm font-medium ${
                  member.freeAfterSavingsCents < 0 ? "text-negative" : "text-positive"
                }`}
              >
                {formatCents(member.freeAfterSavingsCents)}
              </span>
            </header>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Metric label={copy.income} cents={member.incomeCents} />
              <Metric label={copy.ownFixed} cents={member.ownFixedCents} />
              <Metric label={copy.sharedShare} cents={member.sharedShareCents} />
              <Metric label={copy.ownVariable} cents={member.ownVariableCents} />
              <Metric
                label={copy.sharedVariableShare}
                cents={member.sharedVariableShareCents}
              />
              <Metric label={copy.savingsRate} cents={member.savingsRateCents} />
            </dl>
            <div className="border-line mt-4 flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-ink-muted">{copy.freeAfterSavings}</span>
              <span className="font-ledger tabular font-medium">
                {formatCents(member.freeAfterSavingsCents)}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-muted truncate text-xs">{label}</dt>
      <dd className="font-ledger tabular mt-1 truncate text-sm font-medium">
        {formatCents(cents)}
      </dd>
    </div>
  );
}

function CategoriesSection({ dashboard }: { dashboard: DashboardData }) {
  const t = getMessages();
  const copy = t.sections.overview.categories;
  const max = dashboard.categories[0]?.monthlyCents ?? 0;
  return (
    <section aria-labelledby="dashboard-categories">
      <CardTitle id="dashboard-categories" className="mb-3">
        {copy.title}
      </CardTitle>
      <Card className="p-4 sm:p-5">
        {dashboard.categories.length === 0 ? (
          <p className="text-ink-muted text-sm">
            {copy.total}: {formatCents(0)}
          </p>
        ) : (
          <ul className="space-y-4">
            {dashboard.categories.map((category, index) => (
              <CategoryRow
                key={category.categoryId ?? "uncategorized"}
                category={category}
                max={max}
                index={index}
              />
            ))}
          </ul>
        )}
        <div className="border-line mt-5 flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-ink-muted">{copy.total}</span>
          <span className="font-ledger tabular font-medium">
            {formatCents(
              dashboard.summary.fixedTotalCents + dashboard.summary.variableTotalCents,
            )}
          </span>
        </div>
      </Card>
    </section>
  );
}

function CategoryRow({
  category,
  max,
  index,
}: {
  category: DashboardCategory;
  max: number;
  index: number;
}) {
  const t = getMessages();
  const copy = t.sections.overview.categories;
  const width = max > 0 ? Math.round((category.monthlyCents * 100) / max) : 0;
  return (
    <li>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-muted shrink-0">
          <CategoryIcon name={category.icon ?? "circle-dashed"} />
        </span>
        <span className="min-w-0 flex-1 truncate">
          {category.name ?? copy.uncategorized}
        </span>
        <span className="font-ledger tabular shrink-0 font-medium">
          {formatCents(category.monthlyCents)}
        </span>
      </div>
      <div className="bg-surface-muted mt-2 h-2 overflow-hidden rounded-full">
        <div
          className="bar-grow bg-brass h-full rounded-full"
          // The bars are already sorted by size, so a per-row delay lets the ranking
          // read top to bottom instead of landing as one block. Capped, because past a
          // handful of categories the tail would still be drawing while the user reads.
          style={
            {
              width: `${width}%`,
              "--motion-delay": `${Math.min(index, 6) * 60}ms`,
            } as CSSProperties
          }
          aria-hidden
        />
      </div>
    </li>
  );
}

/**
 * Variable costs on the dashboard.
 *
 * Deliberately not just another row of totals: what makes these different from fixed
 * costs is *which* figure counts, so every row says so — the counted amount on the right,
 * and beneath it what was planned against what was booked. A plan-mode row shows the two
 * as equal, which is the honest picture of a budget nobody is tracking receipts for.
 */
function VariableSection({ dashboard }: { dashboard: DashboardData }) {
  const t = getMessages();
  const copy = t.sections.overview.variable;
  const detail = t.sections.variableCosts;

  return (
    <section aria-labelledby="dashboard-variable" className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <CardTitle id="dashboard-variable">{copy.title}</CardTitle>
        <Link
          href={`/variable-kosten?monat=${dashboard.period}`}
          className={buttonStyles({ variant: "ghost", size: "sm" })}
        >
          {copy.action}
        </Link>
      </div>
      <Card className="p-4 sm:p-5">
        {dashboard.variableCosts.length === 0 ? (
          <p className="text-ink-muted text-sm">{copy.empty}</p>
        ) : (
          <ul className="space-y-4">
            {dashboard.variableCosts.map((cost) => (
              <li key={cost.id} className="flex items-start gap-3">
                <span className="text-ink-muted mt-0.5 shrink-0">
                  <CategoryIcon name={cost.categoryIcon ?? "circle-dashed"} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{cost.label}</p>
                  <p className="text-ink-muted mt-0.5 text-xs">
                    {cost.mode === "detailed"
                      ? `${copy.booked} ${formatCents(cost.bookedCents)} · ${copy.planned} ${formatCents(cost.plannedCents)}`
                      : `${copy.planned} ${formatCents(cost.plannedCents)} · ${detail.modeBadgePlan}`}
                  </p>
                </div>
                <span
                  className={`font-ledger tabular shrink-0 text-sm font-medium ${
                    cost.remainingCents < 0 ? "text-negative" : ""
                  }`}
                >
                  {formatCents(cost.countedCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-line mt-5 flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-ink-muted">{copy.total}</span>
          <span className="font-ledger tabular font-medium">
            {formatCents(dashboard.summary.variableTotalCents)}
          </span>
        </div>
      </Card>
    </section>
  );
}

function SavingsSection({ dashboard }: { dashboard: DashboardData }) {
  const t = getMessages();
  const copy = t.sections.overview.savings;
  return (
    <section aria-labelledby="dashboard-savings" className="mt-6">
      <CardTitle id="dashboard-savings" className="mb-3">
        {copy.title}
      </CardTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {dashboard.savingsPots.map((pot) => (
          <Card key={pot.id} className="min-w-0 p-4 sm:p-5">
            <header className="flex items-start justify-between gap-3">
              <h3 className="font-display min-w-0 font-semibold break-words">
                {pot.name}
              </h3>
              <span className="font-ledger tabular shrink-0 text-sm font-medium">
                {formatCents(pot.balanceCents)}
              </span>
            </header>
            <div className="text-ink-muted mt-1 flex justify-between gap-3 text-xs">
              <span>{copy.balance}</span>
              <span>
                {copy.monthlyRate}: {formatCents(pot.monthlyRateCents)}
              </span>
            </div>

            {pot.targetCents === null ? (
              <p className="text-ink-muted mt-5 text-sm">{copy.noTarget}</p>
            ) : (
              <div className="mt-5">
                <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-muted">{copy.progress}</span>
                  <span className="font-ledger tabular font-medium">
                    {formatRatio((pot.progressBp ?? 0) / 10_000)}
                  </span>
                </div>
                <div
                  className="bg-surface-muted h-2 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((pot.progressBp ?? 0) / 100)}
                  aria-label={copy.progress}
                >
                  <div
                    className="bar-grow bg-brass h-full rounded-full"
                    style={{ width: `${(pot.progressBp ?? 0) / 100}%` }}
                  />
                </div>
                <div className="text-ink-muted mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
                  <span>
                    {copy.target}: {formatCents(pot.targetCents)}
                  </span>
                  {pot.overTarget ? (
                    <span className="text-positive font-medium">{copy.overTarget}</span>
                  ) : null}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

/**
 * The series the trend draws, and their colours. Deliberately free of copy: the chart
 * itself needs neither, and a component that takes no strings cannot need a language.
 */
const trendSeries = [
  { key: "incomeCents", color: "var(--color-member-1)" },
  { key: "fixedCostsCents", color: "var(--color-member-2)" },
  { key: "variableCostsCents", color: "var(--color-member-4)" },
  { key: "savingsRateCents", color: "var(--color-member-3)" },
  { key: "freeCashCents", color: "var(--color-brass)" },
] as const;

type TrendKey = (typeof trendSeries)[number]["key"];

function trendLabel(t: Messages, key: TrendKey): string {
  const labels: Record<TrendKey, string> = {
    incomeCents: t.sections.overview.trend.income,
    fixedCostsCents: t.sections.overview.trend.fixedCosts,
    variableCostsCents: t.sections.overview.trend.variableCosts,
    savingsRateCents: t.sections.overview.trend.savingsRate,
    freeCashCents: t.sections.overview.trend.freeCash,
  };
  return labels[key];
}

function TrendSection({ trend }: { trend: TrendPoint[] }) {
  const t = getMessages();
  const copy = t.sections.overview.trend;
  return (
    <section aria-labelledby="dashboard-trend" className="mt-6">
      <CardTitle id="dashboard-trend" className="mb-3">
        {copy.title}
      </CardTitle>
      <Card className="min-w-0 p-4 sm:p-5">
        {trend.length < 2 ? (
          <p className="text-ink-muted text-sm">{copy.empty}</p>
        ) : (
          <>
            <div
              role="img"
              aria-label={copy.chartLabel}
              className="bg-surface-muted/35 rounded-control min-w-0 p-2 sm:p-4"
            >
              <TrendChart trend={trend} />
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {trendSeries.map((line) => (
                <li key={line.key} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: line.color }}
                  />
                  <span>{trendLabel(t, line.key)}</span>
                </li>
              ))}
            </ul>
            <ul
              aria-label={copy.dataLabel}
              className="border-line mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {trend.map((point) => (
                <li key={point.period} className="min-w-0">
                  <p className="font-display text-sm font-semibold">
                    {formatPeriod(point.period)}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {trendSeries.map((line) => (
                      <div key={line.key} className="min-w-0">
                        <dt className="text-ink-muted truncate">
                          {trendLabel(t, line.key)}
                        </dt>
                        <dd className="font-ledger tabular mt-0.5 truncate font-medium">
                          {formatCents(point[line.key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </section>
  );
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const values = trend.flatMap((point) => trendSeries.map((line) => point[line.key]));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const width = 640;
  const height = 240;
  const x = (index: number) =>
    Math.round(24 + (index * (width - 48)) / (trend.length - 1));
  const y = (value: number) => Math.round(24 + ((max - value) * (height - 48)) / range);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <line
        x1="24"
        x2={width - 24}
        y1={y(0)}
        y2={y(0)}
        stroke="var(--color-line)"
        strokeDasharray="4 5"
      />
      {trendSeries.map((line) => (
        <polyline
          key={line.key}
          points={trend
            .map((point, index) => `${x(index)},${y(point[line.key])}`)
            .join(" ")}
          fill="none"
          pathLength={1}
          stroke={line.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          className="line-draw"
        />
      ))}
      {trendSeries.map((line) =>
        trend.map((point, index) => (
          <circle
            key={`${line.key}-${point.period}`}
            cx={x(index)}
            cy={y(point[line.key])}
            r="4"
            fill="var(--color-surface)"
            stroke={line.color}
            strokeWidth="3"
            className="dot-appear"
          />
        )),
      )}
    </svg>
  );
}
