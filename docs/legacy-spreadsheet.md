# Legacy spreadsheet analysis

The system KassenKnoten replaces is a three-sheet Excel workbook. This records what it
did, so the workbook itself is no longer required knowledge. Deliberately no real
figures: the household's actual amounts belong in the running instance, not in a
repository that may one day be public.

## Sheet "Übersicht"

| Block                 | Meaning                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Einnahmen             | Net salary and other income, one row per person, plus their sum                                      |
| Fixkosten             | Private fixed costs per person and the shared total, pulled from the Fixkosten sheet, plus their sum |
| Sparen                | Total monthly savings rate and total current balance, pulled from the savings sheet                  |
| Monatsergebnis        | `income − fixed − savings` = free cash                                                               |
| Aufteilung pro Person | Per person: income, own fixed costs, share of the shared costs, remainder                            |
| Einstellungen         | One cell holding person A's share of shared costs; person B's is `1 − A`                             |

The sheet used colour as its type system: yellow background with blue text meant "enter
here", black text meant "computed", green text meant "reference to another sheet". In the
app that distinction becomes structure instead of convention — inputs are fields, results
are not editable at all.

## Sheet "Fixkosten"

Three blocks, each with the columns `Bezeichnung | Kategorie | Betrag`:

- **Person A · privat**, a fixed range of rows with a `SUM` beneath it
- **Person B · privat**, likewise
- **Gemeinsam**, with two extra columns computing each person's share as
  `Betrag × Übersicht!$B$35` and `× $B$36`

Categories that occurred in the data: Wohnen, Versicherung, Fortbewegung, Sport,
Streaming, Software, Unterhaltung, Gewerkschaft. These seeded the app's default
categories.

Structural limits worth remembering, because they are what the app has to fix:

- The blocks are fixed-size row ranges, so the sheet silently caps how many entries fit.
- The split ratio is global — a single item cannot deviate from it.
- Every amount has to be monthly already; a yearly insurance is divided by hand.
- Rounding is invisible, so the two per-person shares can quietly fail to add up.
- Nothing is validated: a typo in a formula range breaks a total with no warning.

## Sheet "Sparen & Rücklagen"

Columns: `Topf / Ziel | Wer | Rate pro Monat | Stand aktuell | Zielbetrag | Fortschritt`,
a fixed row range, and a totals row. Progress is `IFERROR(Stand / Zielbetrag, "")`, which
renders as an empty cell whenever no target is set — the behaviour `potProgress()`
reproduces by returning `null`.

Pot names in use were of the kind "Notgroschen", "ETF" and "Urlaub", each belonging to one
person, which is why a pot has an optional owner rather than always belonging to the
household.

## What the app does that the sheet could not

History over months, non-monthly intervals normalised automatically, a split mode chosen
per shared item, cent-exact shares, and validation that makes a broken total impossible
rather than merely unlikely.
