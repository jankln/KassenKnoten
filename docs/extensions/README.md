# Extensions

An extension adds your own code to a running KassenKnoten. It is a single `.mjs` file,
installed under **Settings → Extensions**, and it contributes cards to the overview.

## Read this first

An extension runs **on the server, inside the application process, with full access to
your household's database**. It can read every figure, change any of them, and delete
them. There is no sandbox, and this page is not going to pretend there is one.

Installing an extension is installing software on your server. Treat a file somebody sent
you exactly as you would treat any other program from that person.

If an extension breaks the app badly enough that you cannot reach the settings screen, set
`EXTENSIONS_ENABLED=false` in your `.env` and restart. Nothing is loaded then, and you can
remove the file from the `extensions` folder in your data volume.

## The shape of an extension

```js
export const manifest = {
  id: "savings-runway", // lowercase letters, digits and hyphens; also the file name
  name: "Savings runway",
  version: "1.0.0",
  description: "…", // optional
  author: "…", // optional
  apiVersion: 1,
};

export function register(api) {
  api.registerDashboardCard({
    id: "runway",
    title: manifest.name,
    render({ period, summary, db }) {
      return {
        rows: [{ label: "Something", value: "42,00 €", tone: "positive" }],
        note: "Optional sentence underneath.",
      };
    },
  });
}
```

`render` returns rows rather than markup, so a card is drawn in the app's own design
language and looks like it belongs. Return `null` to draw nothing this month.

## What `api` gives you

| Key                               | What it is                                                      |
| --------------------------------- | --------------------------------------------------------------- |
| `api.db`                          | The Drizzle handle. The real one.                               |
| `api.schema`                      | The tables, so you can query them.                              |
| `api.services`                    | `dashboard`, `expenses`, `variableCosts`, `savings`, `members`. |
| `api.domain`                      | `money`, `split`, `period`, `interval` — the pure calculations. |
| `api.format`                      | `formatCents` and friends, so your figures match the app's.     |
| `api.log(…)`                      | Writes to the server log, prefixed with your extension's id.    |
| `api.registerDashboardCard(card)` | Adds a card to the overview.                                    |

Use `api.domain` and `api.format` rather than your own arithmetic: money here is integer
cents and shares are basis points, and an extension that rounds its own way is an
extension that disagrees with every other number on the screen.

## Installing

Settings → Extensions → choose the file, tick the confirmation, install. It is active
straight away. Re-uploading a changed file needs the old one removed first; the loader
picks up the new code without a restart.

## Example

[`savings-runway.mjs`](savings-runway.mjs) — how many months the savings would cover if
the income stopped. Copy it and change the id.
