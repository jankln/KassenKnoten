import { describe, expect, it } from "vitest";
import { checkMethodChange, effectiveMethods, methodsForMode } from "./methods";

const BOTH = { local: true, oidc: true };
const LOCAL = { local: true, oidc: false };
const OIDC = { local: false, oidc: true };
const NONE = { local: false, oidc: false };

describe("effectiveMethods", () => {
  it("uses only what is both configured and chosen", () => {
    expect(effectiveMethods(BOTH, LOCAL)).toEqual(LOCAL);
    expect(effectiveMethods(BOTH, OIDC)).toEqual(OIDC);
    expect(effectiveMethods(LOCAL, BOTH)).toEqual(LOCAL);
  });

  it("keeps a configured provider switched off when the household has not chosen it", () => {
    expect(effectiveMethods(BOTH, LOCAL).oidc).toBe(false);
  });

  it("brings every configured method back when nothing chosen is configured any more", () => {
    // Provider-only was chosen, then the provider was removed from .env: the password
    // has to come back, or the household is locked out of its own instance.
    expect(effectiveMethods(LOCAL, OIDC)).toEqual(LOCAL);
    expect(effectiveMethods(BOTH, NONE)).toEqual(BOTH);
  });
});

describe("checkMethodChange", () => {
  it("allows switching the provider on from a password session", () => {
    expect(
      checkMethodChange({ configured: BOTH, next: BOTH, sessionMethod: "local" }),
    ).toBeUndefined();
  });

  it("refuses a method the environment does not configure", () => {
    expect(
      checkMethodChange({ configured: LOCAL, next: BOTH, sessionMethod: "local" }),
    ).toBe("notConfigured");
  });

  it("refuses switching everything off", () => {
    expect(
      checkMethodChange({ configured: BOTH, next: NONE, sessionMethod: "oidc" }),
    ).toBe("noneLeft");
  });

  it("refuses switching the password off until someone has come in through the provider", () => {
    expect(
      checkMethodChange({ configured: BOTH, next: OIDC, sessionMethod: "local" }),
    ).toBe("ownMethod");
    expect(
      checkMethodChange({ configured: BOTH, next: OIDC, sessionMethod: "oidc" }),
    ).toBeUndefined();
  });

  it("refuses switching the provider off from a provider session", () => {
    expect(
      checkMethodChange({ configured: BOTH, next: LOCAL, sessionMethod: "oidc" }),
    ).toBe("ownMethod");
    expect(
      checkMethodChange({ configured: BOTH, next: LOCAL, sessionMethod: "local" }),
    ).toBeUndefined();
  });
});

describe("methodsForMode", () => {
  it("maps AUTH_MODE to the starting choice", () => {
    expect(methodsForMode("local")).toEqual(LOCAL);
    expect(methodsForMode("oidc")).toEqual(OIDC);
    expect(methodsForMode("both")).toEqual(BOTH);
  });
});
