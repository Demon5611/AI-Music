"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { env } from "@/shared/config/env";
import { appShell } from "@/shared/theme/app-theme";
import { authUi } from "@/shared/ui/auth-classes";

export type AuthGateLayout = "page" | "inline";

interface AuthGateProps {
  title: string;
  hint?: string;
  layout?: AuthGateLayout;
}

export function AuthGate({ title, hint, layout = "page" }: AuthGateProps) {
  if (!env.isClerkEnabled) {
    return null;
  }

  const content = (
    <>
      <p className={authUi.gateTitle}>{title}</p>
      {hint ? <p className={authUi.gateHint}>{hint}</p> : null}
      <div className={authUi.gateActions}>
        <SignInButton mode="modal">
          <button className={`${appShell.siteHeaderAuthButton} w-full sm:w-auto`} type="button">
            Войти
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            className={`${appShell.siteHeaderAuthButtonPrimary} w-full sm:w-auto`}
            type="button"
          >
            Регистрация
          </button>
        </SignUpButton>
      </div>
    </>
  );

  if (layout === "inline") {
    return <div className={authUi.gate}>{content}</div>;
  }

  return (
    <div className={authUi.pageShell}>
      <div className={authUi.pageInner}>
        <div className={authUi.gate}>{content}</div>
      </div>
    </div>
  );
}
