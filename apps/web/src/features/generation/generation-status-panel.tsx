"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import { isGenerationTerminal } from "@/entities/generation-job";
import Link from "next/link";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { usePollingQuery } from "@/shared/hooks/use-polling-query";
import { useApi } from "@/shared/providers/api-provider";
import { appShell } from "@/shared/theme/app-theme";
import {
  AiProcessingStatus,
  GENERATION_STATUS_LABELS,
  isGenerationInProgress,
  LoadingPanel,
  resolveGenerationProgress,
} from "@/shared/ui/elevenlabs";

interface GenerationStatusPanelProps {
  jobId: string;
}

export function GenerationStatusPanel({ jobId }: GenerationStatusPanelProps) {
  const api = useApi();
  const authReady = useAuthReady();

  const jobQuery = usePollingQuery({
    queryKey: ["generations", jobId],
    queryFn: () => api.generations.get(jobId),
    enabled: authReady,
    isTerminal: (job) => Boolean(job && isGenerationTerminal(job.status)),
    intervalMs: 3000,
  });

  if (!authReady) {
    return (
      <section className={appShell.formPage}>
        <LoadingPanel />
      </section>
    );
  }

  if (jobQuery.isLoading) {
    return (
      <section className={appShell.formPage}>
        <h1 className={appShell.formPageTitle}>Генерация</h1>
        <LoadingPanel />
      </section>
    );
  }

  if (jobQuery.error) {
    return (
      <section className={appShell.formPage}>
        <h1 className={appShell.formPageTitle}>Генерация</h1>
        <p className={appShell.formError}>{parseApiError(jobQuery.error, "Не удалось загрузить статус генерации")}</p>
      </section>
    );
  }

  const job = jobQuery.data;

  if (!job) {
    return null;
  }

  const inProgress = isGenerationInProgress(job.status);

  return (
    <section className={appShell.formPage}>
      <h1 className={appShell.formPageTitle}>Генерация</h1>
      <p className={appShell.formMeta}>Job ID: {job.id}</p>

      {inProgress ? (
        <AiProcessingStatus
          agentState="thinking"
          label={GENERATION_STATUS_LABELS[job.status]}
          meta="Обновление каждые 3 сек..."
          progress={resolveGenerationProgress(job.status)}
        />
      ) : (
        <p className={appShell.formMeta}>Статус: {GENERATION_STATUS_LABELS[job.status]}</p>
      )}

      {job.status === "failed" && job.errorMessage ? (
        <p className={appShell.formError}>{job.errorMessage}</p>
      ) : null}

      {job.status === "completed" && job.trackId ? (
        <div className={appShell.formField}>
          <Link className={appShell.formSubmit} href={`/track/${job.trackId}`}>
            Открыть трек
          </Link>
        </div>
      ) : null}

      <Link className={appShell.formHint} href="/profile">
        Вернуться в профиль
      </Link>
    </section>
  );
}
