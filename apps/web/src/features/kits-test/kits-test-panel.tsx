"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KitsInferenceJob } from "@ai-music/shared";
import { env } from "@/shared/config/env";
import { readKitsApiError } from "@/features/kits-test/parse-api-error";
import { appShell } from "@/shared/theme/app-theme";

const POLL_INTERVAL_MS = 2500;

export function KitsTestPanel() {
  const [voiceModelId, setVoiceModelId] = useState("1014961");
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<KitsInferenceJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollJob = useCallback(
    async function poll(jobId: number) {
      setIsPolling(true);
      setError(null);

      try {
        const response = await fetch(`${env.apiUrl}/api/kits/test/${jobId}`);

        if (!response.ok) {
          throw new Error(await readKitsApiError(response));
        }

        const nextJob = (await response.json()) as KitsInferenceJob;
        setJob(nextJob);

        if (nextJob.status === "running") {
          pollTimerRef.current = setTimeout(() => {
            void poll(jobId);
          }, POLL_INTERVAL_MS);
          return;
        }

        stopPolling();

        if (nextJob.status === "error") {
          setError("Kits job finished with error status");
        }
      } catch (pollError) {
        stopPolling();
        setError(
          pollError instanceof Error ? pollError.message : "Polling failed",
        );
      }
    },
    [stopPolling],
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    stopPolling();
    setError(null);
    setJob(null);

    if (!file) {
      setError("Выберите аудиофайл");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("voiceModelId", voiceModelId);
      formData.append("soundFile", file);

      const response = await fetch(`${env.apiUrl}/api/kits/test`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readKitsApiError(response));
      }

      const createdJob = (await response.json()) as KitsInferenceJob;
      setJob(createdJob);

      if (createdJob.status === "running") {
        void pollJob(createdJob.id);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Submit failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const outputUrl =
    job?.outputFileUrl ?? job?.lossyOutputFileUrl ?? job?.recombinedAudioFileUrl;

  return (
    <section className={appShell.formPage}>
      <h1 className={appShell.formPageTitle}>Kits Voice Conversion (test)</h1>
      <p className={appShell.formPageDescription}>
        Загрузите аудио и отправьте job в Kits API через backend. Ключ не
        уходит в браузер.
      </p>

      <form className={appShell.formPageForm} onSubmit={handleSubmit}>
        <label className={appShell.formField}>
          <span className={appShell.formLabel}>Voice Model ID</span>
          <input
            className={appShell.fieldInput}
            value={voiceModelId}
            onChange={(event) => setVoiceModelId(event.target.value)}
            inputMode="numeric"
          />
        </label>

        <label className={appShell.formField}>
          <span className={appShell.formLabel}>Audio file</span>
          <input
            className={appShell.formFileInput}
            type="file"
            accept="audio/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button
          className={appShell.formSubmit}
          type="submit"
          disabled={isSubmitting || isPolling}
        >
          {isSubmitting ? "Отправка..." : "Запустить conversion"}
        </button>
      </form>

      {isPolling ? <p className={appShell.formStatus}>Polling job status...</p> : null}

      {job ? (
        <div className={appShell.kitsTestResult}>
          <p className={appShell.formMeta}>Job ID: {job.id}</p>
          <p className={appShell.formMeta}>Status: {job.status}</p>
        </div>
      ) : null}

      {outputUrl ? (
        <audio className={appShell.kitsTestPlayer} controls src={outputUrl} />
      ) : null}

      {error ? <p className={appShell.formError}>{error}</p> : null}
    </section>
  );
}
