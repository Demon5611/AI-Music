"use client";

import { ApiError } from "@ai-music/api-client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useApi } from "@/shared/providers/api-provider";
import { env } from "@/shared/config/env";
import styles from "./styles/profile-panel.module.css";

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === "object") {
    const body = error.body as { error?: string };
    if (body.error) {
      return body.error;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Не удалось загрузить профиль";
}

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

  const isLoading = userQuery.isLoading || creditsQuery.isLoading;
  const error = userQuery.error ?? creditsQuery.error;

  if (isLoading) {
    return <p className={styles.status}>Загрузка профиля...</p>;
  }

  if (error) {
    return (
      <div className={styles.errorBox}>
        <p className={styles.error}>{resolveErrorMessage(error)}</p>
        {!env.isClerkEnabled ? (
          <p className={styles.hint}>
            Убедитесь, что API запущен (`pnpm dev:api`) и Docker с Postgres поднят (`pnpm
            docker:up`).
          </p>
        ) : null}
      </div>
    );
  }

  const user = userQuery.data;
  const balance = creditsQuery.data?.balance ?? 0;

  if (!user) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Профиль</h1>

      <dl className={styles.details}>
        <div className={styles.row}>
          <dt className={styles.label}>Email</dt>
          <dd className={styles.value}>{user.email}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Имя</dt>
          <dd className={styles.value}>{user.name ?? "—"}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Credits</dt>
          <dd className={styles.value}>{balance}</dd>
        </div>
        {!env.isClerkEnabled ? (
          <div className={styles.row}>
            <dt className={styles.label}>Dev user</dt>
            <dd className={styles.value}>{user.id}</dd>
          </div>
        ) : null}
      </dl>

      <div className={styles.actions}>
        <Link href="/music-create" className={styles.primaryLink}>
          Создать трек
        </Link>
        <Link href="/pricing" className={styles.secondaryLink}>
          Тарифы
        </Link>
      </div>
    </section>
  );
}
