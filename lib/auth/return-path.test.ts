import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./return-path";

describe("safeReturnPath", () => {
  it("keeps a path on this instance, query included", () => {
    expect(safeReturnPath("/fixkosten")).toBe("/fixkosten");
    expect(safeReturnPath("/variable-kosten?monat=2026-05")).toBe(
      "/variable-kosten?monat=2026-05",
    );
  });

  it("refuses anything a browser would read as another host", () => {
    for (const value of [
      "//evil.example",
      "/\\evil.example",
      "https://evil.example",
      "",
    ]) {
      expect(safeReturnPath(value)).toBe("/");
    }
    expect(safeReturnPath(null)).toBe("/");
  });

  it("refuses the sign-in routes themselves", () => {
    for (const value of [
      "/login",
      "/login/ended",
      "/login/oidc",
      "/login?fehler=denied",
    ]) {
      expect(safeReturnPath(value)).toBe("/");
    }
    expect(safeReturnPath("/loginhilfe")).toBe("/loginhilfe");
  });
});
