"use client";

import { AuthGate } from "@/shared/ui/auth-gate";

type VoiceAuthGateVariant = "landing" | "page";

interface VoiceAuthGateProps {
  variant?: VoiceAuthGateVariant;
}

const COPY: Record<
  VoiceAuthGateVariant,
  { title: string; hint: string }
> = {
  landing: {
    title: "Начните с создания голоса",
    hint: "Зарегистрируйтесь бесплатно — затем запишите образец и создайте трек с вашим вокалом.",
  },
  page: {
    title: "Войдите, чтобы записать голос",
    hint: "Запись и верификация голоса доступны после входа в аккаунт.",
  },
};

export function VoiceAuthGate({ variant = "landing" }: VoiceAuthGateProps) {
  const copy = COPY[variant];

  return (
    <AuthGate
      hint={copy.hint}
      layout={variant === "landing" ? "inline" : "page"}
      title={copy.title}
    />
  );
}
