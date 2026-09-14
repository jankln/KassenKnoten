"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Info, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useMessages } from "@/components/providers/messages-provider";
import type { MethodSet, SignInMethod } from "@/lib/auth/methods";
import {
  addAllowedEmail,
  removeAllowedEmail,
  switchSignInMethod,
} from "./sign-in-actions";

export interface SignInCardProps {
  configured: MethodSet;
  effective: MethodSet;
  chosenInSettings: boolean;
  allowlist: string[];
  allowlistInSettings: boolean;
  /** For sentences: the configured name, or "single sign-on". */
  providerName: string;
  /** For the row heading: the configured name, or "Identity provider". */
  providerTitle: string;
  redirectUri: string;
  session: { method: SignInMethod; email?: string };
}

/**
 * Switching sign-in methods and keeping the allowlist.
 *
 * Every line on this card says whether it is about the environment (what is possible) or
 * about this screen (what is used). The buttons that the server would refuse — switching
 * off the method this session came in with, removing your own address — are not rendered,
 * and a sentence says what to do instead, so the guard reads as guidance rather than as a
 * mysterious error after the click.
 */
export function SignInSettings(props: SignInCardProps) {
  const t = useMessages();
  const copy = t.signIn;
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      after?.();
      toast(copy.saved);
    });
  }

  const providerOnly = props.effective.oidc && !props.effective.local;

  const methods: {
    method: SignInMethod;
    label: string;
    hint: string;
    notConfigured: string;
    guard: string;
  }[] = [
    {
      method: "local",
      label: copy.password,
      hint: copy.passwordHint,
      notConfigured: copy.notConfiguredPassword,
      guard: copy.refused.ownMethodPassword(props.providerName),
    },
    {
      method: "oidc",
      label: props.providerTitle,
      hint: copy.providerHint,
      notConfigured: copy.notConfiguredProvider,
      guard: copy.refused.ownMethodProvider(props.providerName),
    },
  ];

  return (
    <div className="space-y-5">
      <ul className="border-line divide-line rounded-card divide-y border">
        {methods.map(({ method, label, hint, notConfigured, guard }) => {
          const configured = props.configured[method];
          const on = props.effective[method];
          const own = props.session.method === method;
          const otherOn = props.effective[method === "local" ? "oidc" : "local"];
          // Mirrors checkMethodChange: never the last method, never this session's own.
          const canSwitchOff = on && otherOn && !own;

          return (
            <li key={method} className="flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-0 flex-1 basis-48">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="font-medium break-words">{label}</p>
                  <Badge tone={on ? "accent" : "muted"}>
                    {on ? copy.on : copy.off}
                  </Badge>
                </div>
                <p className="text-ink-muted mt-1 text-sm leading-relaxed">
                  {configured ? hint : notConfigured}
                </p>
                {on && own && otherOn ? (
                  <p className="text-ink-muted mt-1 text-xs leading-relaxed">{guard}</p>
                ) : null}
              </div>

              {configured && !on ? (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => switchSignInMethod(method, true))}
                >
                  {copy.switchOn}
                </Button>
              ) : null}
              {canSwitchOff ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => switchSignInMethod(method, false))}
                >
                  {copy.switchOff}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="text-ink-muted space-y-1.5 text-sm leading-relaxed">
        <p>
          {props.session.method === "oidc" && props.session.email
            ? copy.signedInWithProvider(props.session.email, props.providerName)
            : copy.signedInWithPassword}
        </p>
        <p>{props.chosenInSettings ? copy.fromSettings : copy.fromEnvironment}</p>
      </div>

      {providerOnly ? (
        <div className="border-line bg-surface-muted text-ink-muted rounded-control flex items-start gap-3 border px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{copy.recovery}</span>
        </div>
      ) : null}

      {props.configured.oidc ? (
        <Allowlist {...props} providerOnly={providerOnly} pending={pending} run={run} />
      ) : null}

      {error ? (
        <p role="alert" className="text-negative text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Allowlist({
  allowlist,
  allowlistInSettings,
  providerName,
  redirectUri,
  session,
  providerOnly,
  pending,
  run,
}: SignInCardProps & {
  providerOnly: boolean;
  pending: boolean;
  run: (action: () => Promise<{ error?: string }>, after?: () => void) => void;
}) {
  const t = useMessages();
  const copy = t.signIn;
  const [draft, setDraft] = useState("");

  function add(event: FormEvent) {
    event.preventDefault();
    const email = draft.trim();
    if (email === "") {
      return;
    }
    run(
      () => addAllowedEmail(email),
      () => setDraft(""),
    );
  }

  const own = session.method === "oidc" ? session.email?.toLowerCase() : undefined;

  return (
    <div className="border-line space-y-4 border-t pt-5">
      <div>
        <p className="font-medium">{copy.allowlistTitle(providerName)}</p>
        <p className="text-ink-muted mt-1 text-sm leading-relaxed">
          {copy.allowlistHint}
        </p>
      </div>

      {allowlist.length === 0 ? (
        <p className="text-ink-muted text-sm">{copy.allowlistEmpty}</p>
      ) : (
        <ul className="border-line divide-line rounded-card divide-y border">
          {allowlist.map((email) => {
            // Mirrors checkAllowlistChange: not your own address, not the last one when
            // the provider is the only way in.
            const removable =
              email !== own && !(providerOnly && allowlist.length === 1);
            return (
              <li
                key={email}
                className="flex min-h-12 items-center gap-2 py-1 pr-1 pl-4"
              >
                <span className="min-w-0 flex-1 text-sm break-all">{email}</span>
                {removable ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    aria-label={copy.remove(email)}
                    onClick={() => run(() => removeAllowedEmail(email))}
                  >
                    <X className="size-3.5" aria-hidden />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="allowlist-email" className="sr-only">
          {copy.email}
        </label>
        <Input
          id="allowlist-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder={copy.email}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={pending} className="h-11 shrink-0">
          <Plus className="size-4" aria-hidden />
          {copy.add}
        </Button>
      </form>

      {allowlistInSettings ? null : (
        <p className="text-ink-muted text-xs leading-relaxed">
          {copy.allowlistFromEnvironment}
        </p>
      )}

      <div className="space-y-1">
        <p className="text-ink-muted text-xs">{copy.redirectUri}</p>
        <code className="bg-surface-muted rounded-control block px-3 py-2 text-xs break-all">
          {redirectUri}
        </code>
      </div>
    </div>
  );
}
