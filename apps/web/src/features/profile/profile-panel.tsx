"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { pf } from "@/features/profile/profile-classes";
import { useSubscriptionQuery } from "@/features/billing/hooks/use-subscription-query";
import { useApi } from "@/shared/providers/api-provider";
import { env } from "@/shared/config/env";

export function ProfilePanel() {
  const api = useApi();

  const userQuery = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => api.users.getMe(),
  });

  const creditsQuery = useQuery({
    queryKey: ["credits", "balance"],
    queryFn: () => api.credits.getBalance(),
  });

  const subscriptionQuery = useSubscriptionQuery();

  const isLoading = userQuery.isLoading || creditsQuery.isLoading || subscriptionQuery.isLoading;
  const error = userQuery.error ?? creditsQuery.error ?? subscriptionQuery.error;

  if (isLoading) {
    return <p className={pf.status}>Загрузка профиля...</p>;
  }

  if (error) {
    return (
      <div className={pf.errorBox}>
        <p className={pf.error}>{parseApiError(error, "Не удалось загрузить профиль")}</p>
        {!env.isClerkEnabled ? (
          <p className={pf.hint}>
            Убедитесь, что API запущен (`pnpm dev:api`) и Docker с Postgres поднят (`pnpm
            docker:up`).
          </p>
        ) : null}
      </div>
    );
  }

  const user = userQuery.data;
  const balance = subscriptionQuery.data?.creditsBalance ?? creditsQuery.data?.balance ?? 0;
  const planLabel = subscriptionQuery.data?.planLabel ?? "Free";

  if (!user) {
    return null;
  }

  return (
    <section className={pf.section}>
      <h1 className={pf.title}>Профиль</h1>

      <dl className={pf.details}>
        <div className={pf.row}>
          <dt className={pf.label}>Email</dt>
          <dd className={pf.value}>{user.email}</dd>
        </div>
        <div className={pf.row}>
          <dt className={pf.label}>Имя</dt>
          <dd className={pf.value}>{user.name ?? "—"}</dd>
        </div>
        <div className={pf.row}>
          <dt className={pf.label}>Тариф</dt>
          <dd className={pf.value}>{planLabel}</dd>
        </div>
        <div className={pf.row}>
          <dt className={pf.label}>Credits</dt>
          <dd className={pf.value}>{balance}</dd>
        </div>
        {!env.isClerkEnabled ? (
          <div className={pf.row}>
            <dt className={pf.label}>Dev user</dt>
            <dd className={pf.value}>{user.id}</dd>
          </div>
        ) : null}
      </dl>

      <div className={pf.actions}>
        <Link className={pf.primaryLink} href="/music-create">
          Создать трек
        </Link>
        <Link className={pf.secondaryLink} href="/pricing">
          Тарифы
        </Link>
      </div>
    </section>
  );
}
