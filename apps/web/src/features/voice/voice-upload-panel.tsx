"use client";

import { ApiError } from "@ai-music/api-client";
import {
  MAX_VOICE_SAMPLE_DURATION_SEC,
  MIN_VOICE_SAMPLE_DURATION_SEC,
  VOICE_CONSENT_PHRASE,
} from "@ai-music/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { readAudioDurationSec } from "@/features/voice/read-audio-duration";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { LoadingPanel } from "@/shared/ui/elevenlabs";
import styles from "@/shared/ui/form.module.css";

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

  return "Не удалось загрузить образец голоса";
}

export function VoiceUploadPanel() {
  const api = useApi();
  const router = useRouter();
  const authReady = useAuthReady();
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Выберите аудиофайл");
      return;
    }

    if (!confirmed) {
      setError("Подтвердите согласие на использование голоса");
      return;
    }

    setIsSubmitting(true);

    try {
      const durationSec = await readAudioDurationSec(file);

      if (durationSec < MIN_VOICE_SAMPLE_DURATION_SEC) {
        throw new Error(
          `Минимальная длительность — ${MIN_VOICE_SAMPLE_DURATION_SEC} сек`,
        );
      }

      if (durationSec > MAX_VOICE_SAMPLE_DURATION_SEC) {
        throw new Error(
          `Максимальная длительность — ${MAX_VOICE_SAMPLE_DURATION_SEC} сек`,
        );
      }

      const formData = new FormData();
      formData.append("soundFile", file);
      formData.append("confirmed", "true");
      formData.append("consentPhrase", VOICE_CONSENT_PHRASE);
      formData.append("durationSec", String(durationSec));

      const sample = await api.voiceSamples.create(formData);
      router.push(`/consent?id=${sample.id}`);
    } catch (submitError) {
      setError(resolveErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!authReady) {
    return (
      <section className={styles.section}>
        <LoadingPanel />
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Запись голоса</h1>
      <p className={styles.description}>
        Загрузите образец своего голоса ({MIN_VOICE_SAMPLE_DURATION_SEC}–
        {MAX_VOICE_SAMPLE_DURATION_SEC} сек). Затем привяжите модель из Kits.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>Аудиофайл</span>
          <input
            className={styles.fileInput}
            type="file"
            accept="audio/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Согласие</span>
          <label className={styles.hint}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />{" "}
            {VOICE_CONSENT_PHRASE}
          </label>
        </label>

        <button
          className={styles.submit}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Загрузка..." : "Загрузить образец"}
        </button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
