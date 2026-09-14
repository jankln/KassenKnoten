import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/current-session";
import { getEnv, oidcRedirectUri } from "@/lib/env";
import { getMessages } from "@/server/i18n";
import { getSignInState } from "@/server/services/sign-in";
import { SettingsHeader } from "../settings-header";
import { SignInSettings } from "../sign-in";

export function generateMetadata(): Metadata {
  return { title: getMessages().sections.settings.groups.signIn.title };
}

export default async function SignInSettingsPage() {
  const t = getMessages();
  const session = await requireSession();
  const env = getEnv();
  const signIn = getSignInState(env);

  return (
    <>
      <SettingsHeader
        title={t.sections.settings.groups.signIn.title}
        subtitle={t.signIn.hint}
      />

      <Card>
        <SignInSettings
          configured={signIn.configured}
          effective={signIn.effective}
          chosenInSettings={signIn.chosenInSettings}
          allowlist={signIn.allowlist}
          allowlistInSettings={signIn.allowlistInSettings}
          providerName={env.oidc?.providerName ?? t.login.providerFallback}
          providerTitle={env.oidc?.providerName ?? t.signIn.providerTitle}
          redirectUri={oidcRedirectUri(env)}
          session={{
            method: session.method,
            ...(session.email ? { email: session.email } : {}),
          }}
        />
      </Card>
    </>
  );
}
