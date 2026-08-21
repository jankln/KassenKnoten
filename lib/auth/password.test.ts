import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("produces an argon2id hash that verifies", async () => {
    const hash = await hashPassword("richtig-langes-passwort");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "richtig-langes-passwort")).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("richtig-langes-passwort");
    expect(await verifyPassword(hash, "falsch")).toBe(false);
  });

  it("salts every hash, so identical passwords do not look identical", async () => {
    const [a, b] = await Promise.all([hashPassword("gleich"), hashPassword("gleich")]);
    expect(a).not.toBe(b);
  });

  it("treats a broken hash as a wrong password instead of throwing", async () => {
    expect(await verifyPassword("not-a-hash", "irgendwas")).toBe(false);
    expect(await verifyPassword("", "irgendwas")).toBe(false);
  });
});
