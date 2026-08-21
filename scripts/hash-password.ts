/**
 * Turn a household password into the argon2id hash that belongs in LOCAL_PASSWORD_HASH.
 *
 * Run with: npm run auth:hash
 *
 * Reads the password from stdin rather than argv, so it never lands in the shell history
 * or in the process list of a shared machine.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hashPassword } from "../lib/auth/password.ts";

async function main(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });

  const password = await rl.question("Household password: ");
  rl.close();

  if (password.length < 8) {
    console.error("\nToo short — use at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const hash = await hashPassword(password);
  const encoded = Buffer.from(hash, "utf8").toString("base64");

  // The base64 form is the one to paste: an argon2id hash is full of `$`, and .env
  // parsers and docker-compose both expand those as variables, silently destroying it.
  console.log("\nAdd this line to your .env file:\n");
  console.log(`LOCAL_PASSWORD_HASH=${encoded}\n`);
  console.log("(base64 of the argon2id hash — the raw hash would be mangled by");
  console.log(" .env and docker-compose variable expansion.)\n");
}

void main();
