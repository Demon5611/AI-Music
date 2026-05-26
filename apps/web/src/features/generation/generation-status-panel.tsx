"use client";

import { ApiError } from "@ai-music/api-client";
import type { GenerationJob } from "@ai-music/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import styles from "@/shared/ui/form.module.css";

const TERMINAL_STATUSES = new Set<GenerationJob["status"]>([
  "completed",
  "failed",
]);

const STATUS_LABELS: Record<GenerationJob["status"], string> = {
  pending: "В очереди",
  preprocessing_voice: "Подготовка голоса",
  generating_lyrics: "Генерация текста",
  generating_song: "Генерация музыки",
  converting_voice: "Voice transfer (Kits)",
  uploading_result: "Сохранение результата",
  completed: "Готово",
  failed: "Ошибка",
};

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

  return "Не удалось загрузить статус генерации";
}

interface GenerationStatusPanelProps {
  jobId: string;
}

export function GenerationStatusPanel({ jobId }: GenerationStatusPanelProps) {
  const api = useApi();
  const authReady = useAuthReady();

  const jobQuery = useQuery({
    queryKey: ["generations", jobId],
    queryFn: () => api.generations.get(jobId),
    enabled: authReady,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || TERMINAL_STATUSES.has(status)) {
        return false;
      }

      return 3000;
    },
  });

  if (!authReady) {
    return <p className={styles.status}>Загрузка сессии...</p>;
  }

  if (jobQuery.isLoading) {
    return <p className={styles.status}>Загрузка статуса...</p>;
  }

  if (jobQuery.error) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>Генерация</h1>
        <p className={styles.error}>{resolveErrorMessage(jobQuery.error)}</p>
      </section>
    );
  }

  const job = jobQuery.data;

  if (!job) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Генерация</h1>
      <p className={styles.meta}>Job ID: {job.id}</p>
      <p className={styles.meta}>Статус: {STATUS_LABELS[job.status]}</p>

      {job.status === "failed" && job.errorMessage ? (
        <p className={styles.error}>{job.errorMessage}</p>
      ) : null}

      {job.status === "completed" && job.trackId ? (
        <div className={styles.field}>
          <Link href={`/track/${job.trackId}`} className={styles.submit}>
            Открыть трек
          </Link>
        </div>
      ) : null}

      {!TERMINAL_STATUSES.has(job.status) ? (
        <p className={styles.status}>Обновление каждые 3 сек...</p>
      ) : null}

      <Link href="/profile" className={styles.hint}>
        Вернуться в профиль
      </Link>
    </section>
  );
}
