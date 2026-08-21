import { describe, expect, it } from "vitest";
import { isCurrent } from "./nav-items";

describe("isCurrent", () => {
  it("marks the overview only on the exact root", () => {
    expect(isCurrent("/", "/")).toBe(true);
    expect(isCurrent("/", "/fixkosten")).toBe(false);
  });

  it("marks a section on its sub-pages too", () => {
    expect(isCurrent("/fixkosten", "/fixkosten")).toBe(true);
    expect(isCurrent("/fixkosten", "/fixkosten/neu")).toBe(true);
    expect(isCurrent("/fixkosten", "/sparen")).toBe(false);
  });
});
