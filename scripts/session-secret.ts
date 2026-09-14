/**
 * Print a fresh session secret as the line that belongs in `.env`.
 *
 * Runs inside the image, like the password and second-factor scripts, so setting up needs
 * Docker and nothing else — no `openssl`, which a Windows machine does not have.
 *
 * Only the line itself goes to stdout, so it can be appended straight to the file on any
 * system:
 *
 *   docker run --rm ghcr.io/jankln/kassenknoten node scripts/session-secret.ts >> .env
 *   docker run --rm ghcr.io/jankln/kassenknoten node scripts/session-secret.ts | Add-Content .env
 *
 * Thirty-two random bytes, base64: what `openssl rand -base64 32` printed before, and more
 * than the thirty-two characters `lib/env.ts` insists on.
 */
import { randomBytes } from "node:crypto";

process.stdout.write(`SESSION_SECRET=${randomBytes(32).toString("base64")}\n`);
