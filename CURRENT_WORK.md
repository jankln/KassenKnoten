# Current work

**Status:** idle — nothing in flight.

Last finished: **F26 – English, and a language the household chooses**. The interface
speaks English by default and German when asked. The setup wizard offers the choice before
it asks anything else, and the settings screen changes it later; the choice belongs to the
household, so the tablet in the kitchen agrees with the laptop.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: `lib/i18n/en.ts` is canonical — `Messages` is derived from it
and `de.ts` is declared as `Messages`, so a missing translation fails the build rather than
shipping. Validation schemas and `formatInterval` are functions of the messages for the
same reason: they are built once at import, and a string baked in then would be frozen in
whichever language happened to be current.

See `docs/WORKFLOW.md` for how this file is used.
