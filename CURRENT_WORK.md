# Current work

**Status:** idle — nothing in flight.

Last finished: **README and landing page describe the product as it is today.** Fresh
screenshots in both languages from the standalone build running the example household —
overview, the month-by-month chart, shared and variable costs, savings, settings, the phone
in dark mode, the sign-in screen with a provider, and the receipt scanner with the
synthetic fixture. The README reads as a description, not a changelog, and links to the
releases for history.

Notes for whoever comes next:

- The screenshots came from a throwaway database seeded with `docs/WORKFLOW.md`'s example
  household, English labels for `docs/media/en/` and German ones for `docs/media/`. Desktop
  shots are 1440 × 1000 at `SCALE=1.5`, phones 390 × 844 and 430 × 900 at 2, reduced to
  256 colours.
- Not yet tried against a live Authentik, only against `oidc-provider`.

See `docs/WORKFLOW.md` for how this file is used.
