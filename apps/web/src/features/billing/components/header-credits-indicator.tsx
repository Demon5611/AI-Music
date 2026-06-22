"use client";

import { formatCredits, resolveCreditsBalancePercent, type PlanId } from "@ai-music/shared";
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
  fillStyle: CSSProperties;
} {
  const fillPercent = resolveCreditsBalancePercent(balance, planId);

  return {
    planLabel,
    balanceLabel: formatCredits(balance),
    fillPercent,
    fillStyle: { "--credits-fill-percent": `${fillPercent}%` } as CSSProperties,
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
  const { balanceLabel, fillPercent, fillStyle, planLabel: label } = resolveIndicatorState(
    planId,
    planLabel,
    creditsBalance,
  );

  return (
    <div
      aria-label={`${label}, ${balanceLabel} credits, ${fillPercent}% от лимита тарифа`}
      className={className ?? appShell.siteHeaderCredits}
      title={`${label} · ${balanceLabel} credits · ${fillPercent}%`}
    >
      <span className={appShell.siteHeaderCreditsLabel}>
        {label} {balanceLabel} Credits
      </span>
      <div className={appShell.siteHeaderCreditsBarTrack}>
        <div className={appShell.siteHeaderCreditsBarFill} style={fillStyle} />
        <span className={appShell.siteHeaderCreditsBarPercent}>{fillPercent}%</span>
      </div>
    </div>
  );
}
