"use client";

import { SignInButton } from "@clerk/nextjs";
import { PAID_PLAN_IDS, PLANS, type PaidPlanId, type PlanId } from "@ai-music/shared";
import { parseApiError } from "@/shared/lib/parse-api-error";
import { useApi } from "@/shared/providers/api-provider";
import { useSubscriptionQuery } from "@/features/billing/hooks/use-subscription-query";
import { pricing } from "@/features/billing/pricing-classes";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuthSession } from "@/shared/hooks/use-auth-ready";

const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: [
    "🎵 Создавай AI-треки по текстовому описанию",
    "🎤 Замени голос на свой",
    "✍️ AI поможет написать текст песни",
    "⏱️ Треки до 60 секунд",
    "🎼 Базовый музыкальный редактор",
    "📤 Экспорт готового трека (MP3)",
    "🕒 Сохраняй разные версии трека (Render)",
  ],
  pro: [
    "Всё из Free +",
    "🎵 Треки до 3 минут",
    "🎚️ Полный музыкальный редактор",
    "🎤 Больше замен голоса",
    "🎤 Караоке-режим с синхронным текстом",
    "🎚️ Разделение вокала и музыки",
    "🕒 История последних 10 проектов",
    "⚡ Получай результат быстрее (быстрее, чем Free, но медленнее, чем Studio)",
    "🎨 Генерация обложки для трека",
    "🔥 Около 18 полностью готовых треков в месяц",
  ],
  studio: [
    "Всё из Pro +",
    "🚀 Самая быстрая очередь",
    "💾 История до 100 проектов",
    "🎬 Экспорт видео для TikTok, Shorts и Reels",
    "🎵 AI Remix одним кликом",
    "🎤 Набор голосовых пресетов",
    "📀 Экспорт трека в WAV (дополнительный формат, Studio)",
    "🔥 До 73 полностью готовых треков в месяц",
  ],
};

const PLAN_TAGLINES: Partial<Record<PlanId, string>> = {
  free: "Попробуй AI Music бесплатно",
  pro: "Для тех, кто регулярно делает музыку",
  studio: "Для музыкантов, блогеров и продюсеров",
};

function formatDurationLimit(seconds: number): string {
  if (seconds <= 60) {
    return "До 60 сек";
  }

  if (seconds <= 120) {
    return "До 2 мин";
  }

  return "2–3 мин";
}

export function PricingPanel() {
  const api = useApi();
  const { isSignedIn } = useAuthSession();
  const subscriptionQuery = useSubscriptionQuery();
  const [checkoutPlanId, setCheckoutPlanId] = useState<PaidPlanId | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentPlanId = isSignedIn ? (subscriptionQuery.data?.planId ?? "free") : null;

  const handleCheckout = async (planId: PaidPlanId) => {
    setActionError(null);
    setCheckoutPlanId(planId);

    try {
      const session = await api.billing.createCheckoutSession({ planId });
      window.location.assign(session.url);
    } catch (error) {
      setActionError(parseApiError(error, "Не удалось открыть оплату"));
      setCheckoutPlanId(null);
    }
  };

  const handlePortal = async () => {
    setActionError(null);

    try {
      const session = await api.billing.createPortalSession();
      window.location.assign(session.url);
    } catch (error) {
      setActionError(parseApiError(error, "Не удалось открыть управление подпиской"));
    }
  };

  return (
    <section className={pricing.page}>
      <h1 className={pricing.title}>Тарифы</h1>
      <p className={pricing.subtitle}>
        Подписка открывает функции редактора и ежемесячный пакет credits. Credits не сгорают.
      </p>

      {actionError ? <p className={pricing.error}>{actionError}</p> : null}

      <div className={pricing.grid}>
        {(Object.keys(PLANS) as PlanId[]).map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = isSignedIn && currentPlanId === planId;
          const isPaid = PAID_PLAN_IDS.includes(planId as PaidPlanId);
          const isRecommended = planId === "pro";
          const tagline = PLAN_TAGLINES[planId];

          return (
            <article
              key={planId}
              className={cn(
                pricing.card,
                isCurrent ? pricing.cardCurrent : undefined,
                isRecommended ? pricing.cardRecommended : undefined,
              )}
            >
              <div className={pricing.cardHeader}>
                <div className={pricing.planTitleRow}>
                  <h2 className={pricing.planName}>{plan.label}</h2>
                  {isRecommended ? <span className={pricing.planBadge}>Most Popular</span> : null}
                </div>
                <p className={pricing.planPrice}>
                  {plan.priceUsd === 0 ? (
                    "0"
                  ) : (
                    <>
                      ${plan.priceUsd}
                      <span className={pricing.planPriceHint}> / мес</span>
                    </>
                  )}
                </p>
                <p className={pricing.credits}>
                  {plan.monthlyCredits} credits · {formatDurationLimit(plan.maxTrackDurationSec)}
                </p>
                {tagline ? <p className={pricing.planTagline}>{tagline}</p> : null}
              </div>

              <ul className={pricing.featureList}>
                {PLAN_FEATURES[planId].map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <div className={pricing.actionWrap}>
                {isCurrent ? (
                  <button className={pricing.disabledButton} disabled type="button">
                    Текущий план
                  </button>
                ) : isPaid ? (
                  isSignedIn ? (
                    <button
                      className={pricing.primaryButton}
                      disabled={checkoutPlanId === planId}
                      type="button"
                      onClick={() => void handleCheckout(planId as PaidPlanId)}
                    >
                      {checkoutPlanId === planId ? "Переход к оплате..." : "Выбрать план"}
                    </button>
                  ) : (
                    <SignInButton mode="modal">
                      <button className={pricing.primaryButton} type="button">
                        Войти, чтобы выбрать план
                      </button>
                    </SignInButton>
                  )
                ) : (
                  <button className={pricing.disabledButton} disabled type="button">
                    Бесплатный план
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {isSignedIn && currentPlanId !== "free" ? (
        <div className={pricing.notice}>
          <p>
            Текущий план: <strong>{subscriptionQuery.data?.planLabel ?? currentPlanId}</strong>.
            Credits: {subscriptionQuery.data?.creditsBalance ?? "—"}.
          </p>
          <button
            className={cn(pricing.secondaryButton, "mt-3")}
            type="button"
            onClick={() => void handlePortal()}
          >
            Управление подпиской
          </button>
        </div>
      ) : null}
    </section>
  );
}
