"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { env } from "@/shared/config/env";
import { appShell } from "@/shared/theme/app-theme";
import { voiceUi } from "@/features/voice/voice-classes";

type VoiceAuthGateVariant = "landing" | "page";

interface VoiceAuthGateProps {
  variant?: VoiceAuthGateVariant;
}

export function VoiceAuthGate({ variant = "landing" }: VoiceAuthGateProps) {
  const isLanding = variant === "landing";

  if (!env.isClerkEnabled) {
    return null;
  }

  return (
    <div className={voiceUi.authGate}>
      <p className={voiceUi.authGateTitle}>
        {isLanding ? "Начните с создания голоса" : "Войдите, чтобы записать голос"}
      </p>
      <p className={voiceUi.authGateHint}>
        {isLanding
          ? "Зарегистрируйтесь бесплатно — затем запишите образец и создайте трек с вашим вокалом."
          : "Запись и верификация голоса доступны после входа в аккаунт."}
      </p>
      <div className={voiceUi.authGateActions}>
        <SignInButton mode="modal">
          <button className={appShell.siteHeaderAuthButton} type="button">
            Войти
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className={appShell.siteHeaderAuthButtonPrimary} type="button">
            Регистрация
          </button>
        </SignUpButton>
      </div>
    </div>
  );
}
