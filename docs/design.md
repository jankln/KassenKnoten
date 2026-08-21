# Visual direction

Established in F04 with the login screen, applied across the app from F05 onwards.
Everything here is a decision, not a default; change it deliberately, not by accident.

## The subject

A household ledger kept by two people, not a banking dashboard. The app is opened on a
phone in a kitchen as often as on a laptop. It should feel calm, precise and personal —
closer to a well-kept notebook than to a fintech product.

## Palette — "Papier & Tinte"

Warm paper against cool ink, with exactly one accent.

| Token                               | Role                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `canvas`                            | Warm paper. The page ground.                                             |
| `surface` / `surface-muted`         | Cards and quiet fills.                                                   |
| `ink` / `ink-muted`                 | Cool near-black text. The warm/cool tension is the point.                |
| `line`                              | Borders. `rule` is its fainter sibling, used only for the ruled texture. |
| `brass`                             | The single accent: the metal of a cash box. Primary actions only.        |
| `positive` / `negative` / `warning` | Money semantics. "Free cash is negative" must read instantly.            |
| `member-1 … member-5`               | One colour per person, used everywhere that person appears.              |

Member colours are core palette, not chart decoration: the same colour identifies a
person in the mark, in a split bar, in a table row and in every future chart.

## Type

Three faces, three jobs:

- **Bricolage Grotesque** — display. Headings and headline figures. Used with restraint.
- **Manrope** — body and UI. Everything read as prose or operated as a control.
- **IBM Plex Mono** — amounts. Money is set in a monospaced face with tabular figures so
  columns line up the way they did in the spreadsheet, which is the one thing a
  spreadsheet is genuinely good at.

## The signature: the Knoten

Two strands, one per person, linked into a knot — two incomes tied into one household.

The mark is not decorative: the same two strands become the split visualisation, where
stroke width carries each person's share. That is why the strands in the mark are
**not equal width** — a household never splits exactly evenly, and the mark says so.

The weave is real. The first strand passes over at the top crossing and under at the
bottom one, using masks placed at the exact intersections of the two circles. Two rings
that do not interlace are just two rings.

## Texture

One texture only: `ruled`, a faint hairline rule every 2.25rem, masked to fade at the
edges. It appears behind full-page moments such as the login screen. It is markedly
fainter in dark mode, where any texture reads as noise.

## Motion

Purposeful, never ambient. The knot ties itself once on the login screen; elsewhere
motion is reserved for state that actually changed — a number counting to its new value,
a row leaving a list, a share bar re-proportioning after a split changes. All of it sits
behind `prefers-reduced-motion`, which the base layer already honours globally.

## Copy

German, sentence case, plain verbs, no filler and no apologies. A control says what it
does and keeps that name through the whole flow: the button reads "Anmelden", the failure
reads "Das Passwort stimmt nicht." — what happened, in the interface's voice, with no
speculation about why.
