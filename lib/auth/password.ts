import { hash, verify, type Algorithm } from "@node-rs/argon2";

/**
 * The household password.
 *
 * argon2id with the reference parameters recommended by OWASP for interactive logins:
 * 19 MiB of memory, two passes. The hash never lives in the database — it is supplied
 * through the environment, so a copy of the SQLite file is not a copy of the password.
 */
const OPTIONS = {
  // Argon2id. Referenced by value because the package declares an ambient
  // const enum, which cannot be read under verbatimModuleSyntax.
  algorithm: 2 as Algorithm,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/**
 * Verify a password against a stored hash. Never throws on a malformed hash: a broken
 * `LOCAL_PASSWORD_HASH` must read as "wrong password", not as a stack trace on the
 * login screen.
 */
export async function verifyPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, password, OPTIONS);
  } catch {
    return false;
  }
}
