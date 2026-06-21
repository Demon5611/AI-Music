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
    "AI Music Generation",
    "Свой голос в генерации",
    "До 60 сек трек",
    "Music Editor Lite",
    "WAV Export",
  ],
  pro: [
    "До 3 минут трек",
    "Music Editor Advanced",
    "Stem Separation",
    "Replace Sections",
    "WAV Export",
    "Version History",
    "Priority Queue",
  ],
  studio: [
    "Всё из Pro",
    "Fastest Queue",
    "Unlimited Projects",
    "Extended Version History",
    "More Stem Processing",
    "Early Access",
  ],
};

const PLAN_TAGLINES: Partial<Record<PlanId, string>> = {
  pro: "For creators editing tracks every week",
  studio: "For musicians, producers and heavy users",
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
