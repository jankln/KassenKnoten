/**
 * Start the standalone build for the end-to-end tests, the way the container starts it.
 *
 * Not `next dev`, and not `next start`: the image runs `node server.js` from
 * `.next/standalone`, and the receipt scanner shipped broken for three releases precisely
 * because the development server has files the standalone output does not. A smoke test
 * that runs anywhere else would have passed through all three.
 *
 * Every run gets a throwaway database and extensions directory, a fresh session secret and
 * a password hash made here from a test password — nothing is read from `.env`, so a run
 * can never touch a real instance's data. Build first:
 *
 *   BUILD_STANDALONE=1 npm run build
 *
 * Playwright starts this through `webServer` in `playwright.config.ts`.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { hashPassword } from "../lib/auth/password.ts";

// Set by playwright.config.ts, which the test reads them from as well.
const port = Number(process.env.E2E_PORT);
const password = process.env.E2E_PASSWORD;
if (!port || !password) {
  console.error(
    "e2e-server: E2E_PORT and E2E_PASSWORD must be set; run it through Playwright.",
  );
  process.exit(1);
}

const standalone = resolve(".next/standalone");
if (!existsSync(join(standalone, "server.js"))) {
  console.error(
    "e2e-server: no standalone build. Run `BUILD_STANDALONE=1 npm run build` first.",
  );
  process.exit(1);
}

// A local build copies the working tree's `.env` files into the standalone output, and
// `server.js` loads them — a real TOTP_SECRET or OIDC_ISSUER would then leak into the test
// instance. The image never has them (`.dockerignore`), so neither does this.
for (const entry of readdirSync(standalone)) {
  if (entry === ".env" || entry.startsWith(".env.")) {
    rmSync(join(standalone, entry));
  }
}

// The Dockerfile copies these beside the server; the standalone output leaves them out.
cpSync(".next/static", join(standalone, ".next/static"), { recursive: true });
cpSync("public", join(standalone, "public"), { recursive: true });

const data = mkdtempSync(join(tmpdir(), "kk-e2e-"));
const cleanUp = () => rmSync(data, { recursive: true, force: true });

// The same function `npm run auth:hash` uses, so the test signs in against a real hash.
const passwordHash = await hashPassword(password);

const server = spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  stdio: "inherit",
  env: {
    PATH: process.env.PATH,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    APP_URL: `http://127.0.0.1:${port}`,
    DATABASE_PATH: join(data, "kassenknoten.db"),
    EXTENSIONS_DIR: join(data, "extensions"),
    SESSION_SECRET: randomBytes(32).toString("base64"),
    AUTH_MODE: "local",
    LOCAL_PASSWORD_HASH: Buffer.from(passwordHash).toString("base64"),
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code, signal) => {
  cleanUp();
  process.exit(code ?? (signal ? 0 : 1));
});
