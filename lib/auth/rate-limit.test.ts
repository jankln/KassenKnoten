import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

const WINDOW = 60_000;

function limiter() {
  return createRateLimiter({ limit: 3, windowMs: WINDOW });
}

describe("createRateLimiter", () => {
  it("allows attempts up to the limit", () => {
    const rl = limiter();
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 1).allowed).toBe(true);
    const third = rl.check("a", 2);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("blocks the attempt after the limit and reports the wait", () => {
    const rl = limiter();
    rl.check("a", 0);
    rl.check("a", 0);
    rl.check("a", 0);

    const blocked = rl.check("a", 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(WINDOW - 10_000);
  });

  it("lets attempts through again once the window slides past", () => {
    const rl = limiter();
    rl.check("a", 0);
    rl.check("a", 0);
    rl.check("a", 0);
    expect(rl.check("a", WINDOW + 1).allowed).toBe(true);
  });

  it("counts each client separately", () => {
    const rl = limiter();
    rl.check("a", 0);
    rl.check("a", 0);
    rl.check("a", 0);
    expect(rl.check("a", 0).allowed).toBe(false);
    expect(rl.check("b", 0).allowed).toBe(true);
  });

  it("forgets a client on reset, so a correct password clears the count", () => {
    const rl = limiter();
    rl.check("a", 0);
    rl.check("a", 0);
    rl.check("a", 0);
    rl.reset("a");
    expect(rl.check("a", 0).allowed).toBe(true);
  });
});
