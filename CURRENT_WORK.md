# Current work

**Status:** idle — nothing in flight.

Last finished: **runs anywhere Docker runs, proven per architecture.** Each build job in
`image.yml` now starts the image it built — amd64 on a native amd64 runner, arm64 on a
native arm64 runner — creates the password hash and session secret with the setup scripts
inside it, and runs the Playwright smoke test against the container, including a receipt
read through the API. README and both landing pages say where it runs and give the setup
for Windows in PowerShell next to Linux and macOS; `scripts/session-secret.ts` in the image
replaces `openssl`.

Notes for whoever comes next:

- The PowerShell instructions were not run on a Windows machine; none was available.
  Windows runs the same Linux image through Docker Desktop, so only the shell differs.
- 32-bit ARM (`linux/arm/v7`) is not published: no native runner exists, and an emulated
  build is a separate decision.
- The setup-script commands are short because the image sets `NODE_OPTIONS` to silence
  Node's warning about the standalone `package.json` having no `type`.

See `docs/WORKFLOW.md` for how this file is used.
