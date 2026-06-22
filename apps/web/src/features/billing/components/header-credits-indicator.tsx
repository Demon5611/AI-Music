"use client";

import {
  canAffordTrackGeneration,
  formatCredits,
  resolveCreditsBalancePercent,
  type PlanId,
} from "@ai-music/shared";
import type { CSSProperties } from "react";
import { useSubscriptionQuery } from "@/features/billing/hooks/use-subscription-query";
import { useAuthSession } from "@/shared/hooks/use-auth-ready";
import { appShell } from "@/shared/theme/app-theme";
import { Skeleton } from "@/components/ui/skeleton";

type HeaderCreditsIndicatorProps = {
  className?: string;
};

function resolveIndicatorState(
  planId: PlanId,
  planLabel: string,
  balance: number,
): {
  planLabel: string;
  balanceLabel: string;
  fillPercent: number;
  barStyle: CSSProperties;
} {
  const fillPercent = resolveCreditsBalancePercent(balance, planId);
  const unfilledPercent = 100 - fillPercent;

  return {
    planLabel,
    balanceLabel: formatCredits(balance),
    fillPercent,
    barStyle: {
      "--credits-fill-percent": `${fillPercent}%`,
      "--credits-fill-clip": `inset(0 ${unfilledPercent}% 0 0)`,
    } as CSSProperties,
  };
}

export function HeaderCreditsIndicator({ className }: HeaderCreditsIndicatorProps) {
  const { isSignedIn } = useAuthSession();
  const subscriptionQuery = useSubscriptionQuery();

  if (!isSignedIn) {
    return null;
  }

  if (subscriptionQuery.isLoading) {
    return (
      <div aria-hidden className={className ?? appShell.siteHeaderCredits}>
        <Skeleton className={appShell.siteHeaderCreditsSkeletonLabel} />
        <Skeleton className={appShell.siteHeaderCreditsSkeletonBar} />
      </div>
    );
  }

  if (subscriptionQuery.isError || !subscriptionQuery.data) {
    return null;
  }

  const { planId, planLabel, creditsBalance } = subscriptionQuery.data;
  const isLowBalance = !canAffordTrackGeneration(creditsBalance);
  const { balanceLabel, fillPercent, barStyle, planLabel: label } = resolveIndicatorState(
    planId,
    planLabel,
    creditsBalance,
  );
  const lowBalanceHint = isLowBalance ? ", недостаточно для генерации трека" : "";

  return (
    <div
      aria-label={`${label}, ${balanceLabel} credits, ${fillPercent}% от лимита тарифа${lowBalanceHint}`}
      className={className ?? appShell.siteHeaderCredits}
      title={`${label} · ${balanceLabel} credits · ${fillPercent}%${lowBalanceHint}`}
    >
      <span
        className={
          isLowBalance ? appShell.siteHeaderCreditsLabelLow : appShell.siteHeaderCreditsLabel
        }
      >
        {label} {balanceLabel} Credits
      </span>
      <div
        className={
          isLowBalance ? appShell.siteHeaderCreditsBarTrackLow : appShell.siteHeaderCreditsBarTrack
        }
        style={barStyle}
      >
        <div
          className={
            isLowBalance ? appShell.siteHeaderCreditsBarFillLow : appShell.siteHeaderCreditsBarFill
          }
        />
        <span className={appShell.siteHeaderCreditsBarPercentTrack}>{fillPercent}%</span>
        <span className={appShell.siteHeaderCreditsBarPercentFill}>{fillPercent}%</span>
      </div>
    </div>
  );
}
