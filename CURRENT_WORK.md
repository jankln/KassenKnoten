# Current work

**Status:** idle — nothing in flight.

Last finished: **F29 – Scan a receipt instead of typing it**. A photograph is downscaled
in the browser, read by Tesseract in the application process and parsed into a draft
booking; the household picks the budget and saves. The photo is never written anywhere.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Two notes for whoever comes next:

- `lib/domain/receipt.ts` is the part that matters and is pure. Anything that reads more
  off a receipt — a category, a payment method, line items — belongs there with tests,
  not in the OCR module.
- The trained models are found through `@tesseract.js-data/*`'s own `langPath`, never
  through this app's `import.meta.url`: the app's modules are bundled, and in development
  the bundler hands back a virtual `[project]/…` path that fails at runtime. Both data
  packages are therefore in `serverExternalPackages`, and `next.config.ts` names their
  files for the file tracer.

See `docs/WORKFLOW.md` for how this file is used.
