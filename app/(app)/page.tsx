import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { buttonStyles } from "@/components/ui/button";
import { formatCents, formatPeriod, formatRatio } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import type { DashboardCategory, DashboardData } from "@/server/services/dashboard";
import { getDashboardData } from "@/server/services/dashboard";
import { getSnapshotTrend, type SnapshotTrendPoint } from "@/server/services/snapshots";

export const metadata: Metadata = { title: de.sections.overview.title };

export default function OverviewPage() {
  const copy = de.sections.overview;
  const dashboard = getDashboardData();
  const trend = getSnapshotTrend();

  if (!dashboard.hasData) {
    return (
      <>
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
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

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      <Warnings dashboard={dashboard} />

      <section aria-labelledby="dashboard-kpis">
        <h2 id="dashboard-kpis" className="sr-only">
          {copy.kpi.title}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <SavingsSection dashboard={dashboard} />
      <TrendSection trend={trend} />
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
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
  const copy = de.sections.overview.warnings;
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
  const copy = de.sections.overview.people;
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
  const copy = de.sections.overview.categories;
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
            {formatCents(dashboard.summary.fixedTotalCents)}
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
  const copy = de.sections.overview.categories;
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

function SavingsSection({ dashboard }: { dashboard: DashboardData }) {
  const copy = de.sections.overview.savings;
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

const trendLines = [
  {
    key: "incomeCents",
    label: de.sections.overview.trend.income,
    color: "var(--color-member-1)",
  },
  {
    key: "fixedCostsCents",
    label: de.sections.overview.trend.fixedCosts,
    color: "var(--color-member-2)",
  },
  {
    key: "savingsRateCents",
    label: de.sections.overview.trend.savingsRate,
    color: "var(--color-member-3)",
  },
  {
    key: "freeCashCents",
    label: de.sections.overview.trend.freeCash,
    color: "var(--color-brass)",
  },
] as const;

function TrendSection({ trend }: { trend: SnapshotTrendPoint[] }) {
  const copy = de.sections.overview.trend;
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
              {trendLines.map((line) => (
                <li key={line.key} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: line.color }}
                  />
                  <span>{line.label}</span>
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
                    {trendLines.map((line) => (
                      <div key={line.key} className="min-w-0">
                        <dt className="text-ink-muted truncate">{line.label}</dt>
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

function TrendChart({ trend }: { trend: SnapshotTrendPoint[] }) {
  const values = trend.flatMap((point) => trendLines.map((line) => point[line.key]));
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
      {trendLines.map((line) => (
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
      {trendLines.map((line) =>
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
