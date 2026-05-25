"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KitsInferenceJob } from "@ai-music/ai-providers";
import { env } from "@/shared/config/env";
import { readKitsApiError } from "@/features/kits-test/parse-api-error";
import styles from "./styles/kits-test.module.css";

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
    <section className={styles.section}>
      <h1 className={styles.title}>Kits Voice Conversion (test)</h1>
      <p className={styles.description}>
        Загрузите аудио и отправьте job в Kits API через backend. Ключ не
        уходит в браузер.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>Voice Model ID</span>
          <input
            className={styles.input}
            value={voiceModelId}
            onChange={(event) => setVoiceModelId(event.target.value)}
            inputMode="numeric"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Audio file</span>
          <input
            className={styles.fileInput}
            type="file"
            accept="audio/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button
          className={styles.submit}
          type="submit"
          disabled={isSubmitting || isPolling}
        >
          {isSubmitting ? "Отправка..." : "Запустить conversion"}
        </button>
      </form>

      {isPolling ? <p className={styles.status}>Polling job status...</p> : null}

      {job ? (
        <div className={styles.result}>
          <p className={styles.meta}>Job ID: {job.id}</p>
          <p className={styles.meta}>Status: {job.status}</p>
        </div>
      ) : null}

      {outputUrl ? (
        <audio className={styles.player} controls src={outputUrl} />
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
