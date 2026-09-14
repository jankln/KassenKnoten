"use server";

import { refresh } from "next/cache";
import { requireSession } from "@/lib/auth/current-session";
import { checkAllowlistChange, isAllowed, normaliseEmail } from "@/lib/auth/allowlist";
import {
  checkMethodChange,
  type MethodSet,
  type SignInMethod,
} from "@/lib/auth/methods";
import { getEnv } from "@/lib/env";
import { getMessages } from "@/server/i18n";
import { getSignInState, saveAllowlist, saveMethods } from "@/server/services/sign-in";
import type { ActionResult } from "./actions";

/**
 * Settings → Sign-in.
 *
 * Every refusal is decided by the pure checks in `lib/auth`, against what would be in
 * effect afterwards. The card hides buttons it knows would be refused, but this is the
 * part that holds: a server action is an endpoint whether or not a button points at it.
 */

function providerName(): string {
  return getEnv().oidc?.providerName ?? getMessages().login.providerFallback;
}

export async function switchSignInMethod(
  method: SignInMethod,
  on: boolean,
): Promise<ActionResult> {
  const session = await requireSession();
  const env = getEnv();
  const copy = getMessages().signIn;
  if (method !== "local" && method !== "oidc") {
    return { error: getMessages().validation.failed };
  }

  const state = getSignInState(env);
  // Start from what is in effect, not from what was stored: a stored choice naming a
  // provider that has since left .env must not be saved back as if it still applied.
  const next: MethodSet = { ...state.effective, [method]: on };

  const refusal = checkMethodChange({
    configured: state.configured,
    next,
    sessionMethod: session.method,
  });
  if (refusal === "ownMethod") {
    return {
      error:
        session.method === "local"
          ? copy.refused.ownMethodPassword(providerName())
          : copy.refused.ownMethodProvider(providerName()),
    };
  }
  if (refusal) {
    return { error: copy.refused[refusal] };
  }

  saveMethods(next);
  refresh();
  return {};
}

export async function addAllowedEmail(email: string): Promise<ActionResult> {
  const session = await requireSession();
  const copy = getMessages().signIn;
  const state = getSignInState(getEnv());
  const address = normaliseEmail(String(email));

  if (isAllowed(state.allowlist, address)) {
    return { error: copy.refused.duplicate };
  }
  return change([...state.allowlist, address], state, session);
}

export async function removeAllowedEmail(email: string): Promise<ActionResult> {
  const session = await requireSession();
  const state = getSignInState(getEnv());
  const address = normaliseEmail(String(email));
  return change(
    state.allowlist.filter((entry) => entry !== address),
    state,
    session,
  );
}

function change(
  next: string[],
  state: ReturnType<typeof getSignInState>,
  session: Awaited<ReturnType<typeof requireSession>>,
): ActionResult {
  const refusal = checkAllowlistChange({
    next,
    providerOnly: state.effective.oidc && !state.effective.local,
    session,
  });
  if (refusal) {
    return { error: getMessages().signIn.refused[refusal] };
  }
  saveAllowlist(next);
  refresh();
  return {};
}
