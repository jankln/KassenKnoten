/**
 * Refuse a one-time code that has already been used.
 *
 * A TOTP code is valid for its whole thirty-second step, and with a step of tolerance
 * either way for up to ninety seconds. Without this guard a code read over someone's
 * shoulder, or left on screen, works a second time inside that window — which is exactly
 * the attack a *one-time* password is supposed to close.
 *
 * In-process and in memory, on the same reasoning `rate-limit.ts` already documents: one
 * household, one container, no Redis. A restart forgets the last step, which at worst
 * re-opens a ninety-second window that an attacker cannot cause and cannot predict.
 *
 * Steps only ever move forward, so remembering the highest one accepted is enough — and
 * it also refuses a replayed *earlier* code, which a plain "have I seen this exact code"
 * set would let through after the window slid past it.
 */

export interface ReplayGuard {
  /**
   * Claim a step. `true` the first time, `false` for that step or any earlier one after
   * that — the code has been spent.
   */
  consume(step: number): boolean;
  /** Forget everything. For tests; nothing in the app calls it. */
  reset(): void;
}

export function createReplayGuard(): ReplayGuard {
  let highest: number | undefined;

  return {
    consume(step) {
      if (highest !== undefined && step <= highest) {
        return false;
      }
      highest = step;
      return true;
    },
    reset() {
      highest = undefined;
    },
  };
}

/** The guard the login uses. One household, one secret, one counter. */
export const loginReplayGuard = createReplayGuard();
