/**
 * Print a valid session cookie value for the local dev server, so screenshots and manual
 * curl requests can reach pages behind the login without typing a password.
 *
 * Reads SESSION_SECRET from the environment or .env.local. Development only — it mints a
 * session without checking anything, which is exactly why it never runs in production.
 */
import { readFileSync } from "node:fs";
import { createSessionToken } from "../lib/auth/session.ts";

function secret() {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((entry) => entry.startsWith("SESSION_SECRET="));
  if (!line) {
    throw new Error("No SESSION_SECRET in the environment or .env.local");
  }
  return line
    .slice("SESSION_SECRET=".length)
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

console.log(
  await createSessionToken({ subject: "household", method: "local" }, secret()),
);
