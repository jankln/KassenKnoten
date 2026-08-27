# Current work

**Feature:** F29 – Scan a receipt instead of typing it
**Status:** in progress
**Started:** 2026-08-27

## Goal

A receipt is photographed or picked from the phone's library, and the app reads the total
and the date off it. What is left for the person holding the phone is the one thing the
paper cannot know: which budget this belongs to — their own, or the household's. Today
that same receipt costs three fields typed with one hand while the other holds the paper,
which is why receipts get entered in batches days later, or not at all.

## Scope

- In: image upload on `/variable-kosten`, local OCR, a pure parser for total, date and
  merchant, the existing booking dialog pre-filled from it, a budget picker, a PWA
  shortcut straight into the flow.
- Out: keeping the image (it is an input method, not an archive — it is read in memory
  and never written), line-item extraction, guessing the budget from the merchant,
  creating a new budget from the scan screen, and any cloud service. Nothing about this
  feature contacts a network.

## Decisions

- **Local OCR, `tesseract.js` in the server process.** The alternative was a cloud model
  with better accuracy on crumpled thermal paper, and it was rejected: the README's
  promise is that the data stays on the household's machine, and a receipt photo is the
  most detailed record of a person's day this app would ever hold. Self-hosted has to
  mean the server is the whole story.
- **Traineddata `4.0.0_best_int` (1,3 MB), not the standard 6,8 MB set.** Measured on a
  clean and on a deliberately degraded receipt: identical reads, a fifth of the size.
  `legacyCore: false`, so only the LSTM engine is ever loaded.
- **The OCR runs on the server, the downscale in the browser.** A 12 MP phone photo is
  megabytes over a home uplink and minutes of Tesseract; 1600 px on the long edge and
  greyscale is both faster to send and better to recognise. The client island does the
  one thing a server cannot.
- **No `capture` attribute on the file input.** A plain `accept="image/*"` already offers
  the camera in the OS sheet on both mobile platforms, and it keeps
  `Permissions-Policy: camera=()` in `proxy.ts` true as written.
- **The read is a proposal, never a fact.** A field the parser could not determine stays
  empty rather than guessing, a total that came from the fallback rather than from a
  `SUMME` line is marked as needing a look, and nothing is booked without the save
  button. `docs/design.md` asks the interface to say what happened without speculating —
  an amount silently invented from a bad scan would be the opposite of that.
- **The budget is not guessed.** `docs/PLAN.md` makes the split a deliberate choice per
  item; a receipt that assigns itself to a budget would decide the split by proxy. The
  picker is ordered by most recently used, which is an order and not an assumption.

## Plan

- [ ] `lib/domain/receipt.ts` — pure parser from OCR text to a draft, plus tests built
      from real Tesseract output, including the awkward ones: `50, 00` with the space
      Tesseract inserts, `Geg. BAR` and `Rueckgeld` lines that are larger than the total,
      VAT lines, two-digit years, a receipt with no total keyword at all.
- [ ] `server/receipts/ocr.ts` — one lazily created worker, reused, terminated when idle;
      language follows the household setting; one recognition at a time so two uploads
      cannot pin a home server.
- [ ] `scan-actions.ts` — session first, then zod on type and size, then read.
- [ ] `receipt-scan.tsx` — pick, downscale, upload, progress, pre-filled dialog.
- [ ] Budget picker + the honest note when the receipt's date falls outside the month on
      screen, so a booking never disappears into another month silently.
- [ ] Copy in `en.ts` and `de.ts`.
- [ ] `manifest.ts` shortcut, `next.config.ts` tracing, Dockerfile, README, PLAN.
- [ ] 375 px, `npm run check`, commit, push.

## Notes / decisions

- `package.json` carried an uncommitted `allowScripts` block before this feature started
  (esbuild, better-sqlite3, unrs-resolver). `tesseract.js` adds one more postinstall,
  denied — it only prints an OpenCollective banner.

## Resume here

Start with `lib/domain/receipt.ts` and its test. Everything else is plumbing around it;
the parser is where a wrong answer would quietly book the wrong amount.

See `docs/WORKFLOW.md` for how this file is used.
