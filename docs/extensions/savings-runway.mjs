/**
 * Example extension: how long the savings would last.
 *
 * Copy this file, change the id and the maths, and install it under
 * Settings → Extensions. It runs on the server, inside the app's own process, with the
 * database it is handed — see docs/extensions/README.md before you install anything you
 * did not write.
 */

export const manifest = {
  id: "savings-runway",
  name: "Savings runway",
  version: "1.0.0",
  description:
    "How many months the savings balance would cover if the income stopped today.",
  author: "KassenKnoten",
  apiVersion: 1,
};

export function register(api) {
  api.registerDashboardCard({
    id: "runway",
    title: manifest.name,

    // `context` carries the month on screen and the summary the app already computed, so
    // a card never recomputes — and never disagrees with — the figures beside it.
    render({ summary }) {
      const monthlyCosts = summary.fixedTotalCents + summary.variableTotalCents;
      if (monthlyCosts <= 0) {
        return null;
      }

      const months = summary.savingsBalanceCents / monthlyCosts;
      const { formatCents } = api.format;

      return {
        rows: [
          { label: "Savings balance", value: formatCents(summary.savingsBalanceCents) },
          { label: "Costs per month", value: formatCents(monthlyCosts) },
          {
            label: "Runway",
            value: `${months.toFixed(1)} months`,
            tone: months >= 3 ? "positive" : "negative",
          },
        ],
        note:
          months >= 3
            ? "Three months of cover is the usual rule of thumb."
            : "Under three months of cover.",
      };
    },
  });
}
