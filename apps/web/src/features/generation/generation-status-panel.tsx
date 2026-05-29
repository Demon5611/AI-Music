"use client";

import { ApiError } from "@ai-music/api-client";
import type { GenerationJob } from "@ai-music/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import {
  AiProcessingStatus,
  GENERATION_STATUS_LABELS,
  isGenerationInProgress,
  LoadingPanel,
  resolveGenerationProgress,
} from "@/shared/ui/elevenlabs";
import styles from "@/shared/ui/form.module.css";

const TERMINAL_STATUSES = new Set<GenerationJob["status"]>([
  "completed",
  "failed",
]);

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
    return (
      <section className={styles.section}>
        <LoadingPanel />
      </section>
    );
  }

  if (jobQuery.isLoading) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>Генерация</h1>
        <LoadingPanel />
      </section>
    );
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

  const inProgress = isGenerationInProgress(job.status);

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Генерация</h1>
      <p className={styles.meta}>Job ID: {job.id}</p>

      {inProgress ? (
        <AiProcessingStatus
          agentState="thinking"
          label={GENERATION_STATUS_LABELS[job.status]}
          meta="Обновление каждые 3 сек..."
          progress={resolveGenerationProgress(job.status)}
        />
      ) : (
        <p className={styles.meta}>Статус: {GENERATION_STATUS_LABELS[job.status]}</p>
      )}

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

      <Link href="/profile" className={styles.hint}>
        Вернуться в профиль
      </Link>
    </section>
  );
}
