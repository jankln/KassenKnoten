/**
 * A sliding-window limiter for login attempts.
 *
 * Deliberately in-process and in-memory: one household, one container, no Redis. A
 * restart clears the counters, which is an acceptable trade for having no moving parts —
 * an attacker cannot restart the server.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Attempts left in the current window. */
  remaining: number;
  /** Milliseconds until the next attempt is allowed, 0 when allowed right now. */
  retryAfterMs: number;
}

export interface RateLimiterOptions {
  /** Attempts permitted per window. */
  limit: number;
  windowMs: number;
}

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult;
  /** Forget a key, e.g. after a successful login. */
  reset(key: string): void;
}

export function createRateLimiter({
  limit,
  windowMs,
}: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();

  function prune(now: number): void {
    for (const [key, timestamps] of hits) {
      const fresh = timestamps.filter((time) => now - time < windowMs);
      if (fresh.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, fresh);
      }
    }
  }

  return {
    check(key, now = Date.now()) {
      prune(now);
      const timestamps = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

      if (timestamps.length >= limit) {
        const oldest = timestamps[0] ?? now;
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(0, windowMs - (now - oldest)),
        };
      }

      timestamps.push(now);
      hits.set(key, timestamps);
      return {
        allowed: true,
        remaining: limit - timestamps.length,
        retryAfterMs: 0,
      };
    },

    reset(key) {
      hits.delete(key);
    },
  };
}

/** Five tries per quarter hour: generous for a typo, useless for a guessing attack. */
export const loginLimiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
});
