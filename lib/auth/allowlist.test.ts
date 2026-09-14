import { describe, expect, it } from "vitest";
import { checkAllowlistChange, isAllowed, parseAllowlist } from "./allowlist";

describe("parseAllowlist", () => {
  it("accepts commas, semicolons and whitespace, and collapses duplicates", () => {
    expect(
      parseAllowlist(" alex@example.com, Robin@Example.com;\nalex@example.com "),
    ).toEqual({ emails: ["alex@example.com", "robin@example.com"], invalid: [] });
  });

  it("names malformed entries instead of dropping them silently", () => {
    expect(parseAllowlist("alex@example.com, robin")).toEqual({
      emails: ["alex@example.com"],
      invalid: ["robin"],
    });
  });

  it("reads an unset or empty variable as an empty list", () => {
    expect(parseAllowlist(undefined)).toEqual({ emails: [], invalid: [] });
    expect(parseAllowlist("")).toEqual({ emails: [], invalid: [] });
  });
});

describe("isAllowed", () => {
  it("matches case-insensitively", () => {
    expect(isAllowed(["alex@example.com"], "Alex@Example.COM")).toBe(true);
  });

  it("refuses an address that is not on the list, and a missing one", () => {
    expect(isAllowed(["alex@example.com"], "robin@example.com")).toBe(false);
    expect(isAllowed(["alex@example.com"], undefined)).toBe(false);
  });
});

describe("checkAllowlistChange", () => {
  const passwordSession = { method: "local" as const };
  const alexSession = { method: "oidc" as const, email: "alex@example.com" };

  it("allows emptying the list while the password still works", () => {
    expect(
      checkAllowlistChange({ next: [], providerOnly: false, session: passwordSession }),
    ).toBeUndefined();
  });

  it("refuses emptying the list when the provider is the only way in", () => {
    expect(
      checkAllowlistChange({ next: [], providerOnly: true, session: passwordSession }),
    ).toBe("emptyWhileOnlyProvider");
  });

  it("refuses removing the address of the session making the change", () => {
    expect(
      checkAllowlistChange({
        next: ["robin@example.com"],
        providerOnly: false,
        session: alexSession,
      }),
    ).toBe("ownAddress");
  });

  it("refuses a malformed address", () => {
    expect(
      checkAllowlistChange({
        next: ["alex@example.com", "robin"],
        providerOnly: false,
        session: alexSession,
      }),
    ).toBe("invalid");
  });
});
