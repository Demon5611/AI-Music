"use client";

import {
  PAID_PLAN_IDS,
  PLANS,
  type PaidPlanId,
  type PlanId,
} from "@ai-music/shared";
import { parseApiError } from "@/shared/lib/parse-api-error";
import { useApi } from "@/shared/providers/api-provider";
import { useSubscriptionQuery } from "@/features/billing/hooks/use-subscription-query";
import { pricing } from "@/features/billing/pricing-classes";
import { cn } from "@/lib/utils";
import { useState } from "react";

const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: [
    "Подмена голоса своим",
    "Генерация текста по промту",
    "До 60 сек трек",
    "Упрощённая генерация музыки",
  ],
  starter: [
    "Music editor — Basic",
    "Stem Separation",
    "Replace Sections",
    "WAV Export",
    "До 2 мин трек",
    "≈ 5 полных production flows",
  ],
  pro: [
    "Music editor — Advanced",
    "Priority Queue",
    "Album Cover Generation",
    "2–3 мин трек",
    "≈ 14 полных production flows",
  ],
  creator: [
    "Больше Voice Transfers",
    "Больше Stem Processing",
    "Продвинутый Editor",
    "≈ 36 полных production flows",
  ],
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
  const subscriptionQuery = useSubscriptionQuery();
  const [checkoutPlanId, setCheckoutPlanId] = useState<PaidPlanId | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentPlanId = subscriptionQuery.data?.planId ?? "free";

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
          const isCurrent = currentPlanId === planId;
          const isPaid = PAID_PLAN_IDS.includes(planId as PaidPlanId);

          return (
            <article
              key={planId}
              className={cn(pricing.card, isCurrent ? pricing.cardCurrent : undefined)}
            >
              <div className={pricing.cardHeader}>
                <h2 className={pricing.planName}>{plan.label}</h2>
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
              </div>

              <ul className={pricing.featureList}>
                {PLAN_FEATURES[planId].map((feature) => (
                  <li key={feature} className={pricing.featureItem}>
                    <span aria-hidden="true" className={pricing.featureBullet} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className={pricing.actionWrap}>
                {isCurrent ? (
                  <button className={pricing.disabledButton} disabled type="button">
                    Текущий план
                  </button>
                ) : isPaid ? (
                  <button
                    className={pricing.primaryButton}
                    disabled={checkoutPlanId === planId}
                    type="button"
                    onClick={() => void handleCheckout(planId as PaidPlanId)}
                  >
                    {checkoutPlanId === planId ? "Переход к оплате..." : "Выбрать план"}
                  </button>
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

      {currentPlanId !== "free" ? (
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
