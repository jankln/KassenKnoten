import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: the critical path in a real browser, against the standalone build.
 *
 * `npm run test:e2e` after `BUILD_STANDALONE=1 npm run build`. The server is started by
 * `scripts/e2e-server.mjs` with a throwaway database, so every run begins at a fresh
 * install — the login screen, then the setup wizard.
 *
 * One project, at 375 px. Nothing in this app is done until it works on a phone, and the
 * phone layout is the one with the most to get wrong: the bottom navigation, sheets
 * instead of dialogs, stacked form fields.
 */

const port = 3210;
// A test password for a throwaway instance, not a secret. Shared with the server script
// and the test through the environment so it is written down once.
process.env.E2E_PORT = String(port);
process.env.E2E_PASSWORD ??= "alex-and-robin-e2e";

export default defineConfig({
  testDir: "e2e",
  // The journey builds on itself — a household before a cost, a cost before its shares —
  // so its steps run in order, in one worker, against one database.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    locale: "en-GB",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  webServer: {
    // The same flag the package scripts pass: the server script imports a .ts file.
    command:
      "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/e2e-server.mjs",
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
