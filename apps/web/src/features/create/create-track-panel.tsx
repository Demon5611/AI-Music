"use client";

import { ApiError } from "@ai-music/api-client";
import { MUSIC_STYLES, type CreateGenerationInput } from "@ai-music/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { isVoiceSampleReadyForGeneration } from "@/entities/voice-sample";
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

  return "Не удалось создать генерацию";
}

export function CreateTrackPanel() {
  const api = useApi();
  const router = useRouter();
  const authReady = useAuthReady();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>("pop");
  const [voiceSampleId, setVoiceSampleId] = useState("");
  const [duration, setDuration] = useState("60");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const samplesQuery = useQuery({
    queryKey: ["voice-samples"],
    queryFn: () => api.voiceSamples.list(),
    enabled: authReady,
  });

  const readySamples = useMemo(
    () =>
      (samplesQuery.data ?? []).filter(isVoiceSampleReadyForGeneration),
    [samplesQuery.data],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!voiceSampleId) {
      setError("Выберите образец голоса с привязанной моделью Kits");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await api.generations.create({
        prompt,
        style: style as CreateGenerationInput["style"],
        voiceSampleId,
        duration: Number(duration),
      });
      router.push(`/generation/${result.jobId}`);
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

  if (samplesQuery.isLoading) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>Создать трек</h1>
        <LoadingPanel />
      </section>
    );
  }

  if (!readySamples.length) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>Создать трек</h1>
        <p className={styles.description}>
          Нет готовых образцов с привязанной моделью Kits.
        </p>
        <Link href="/voice" className={styles.submit}>
          Загрузить голос
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Создать трек</h1>
      <p className={styles.description}>
        Опишите песню, выберите стиль и образец голоса.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>Prompt</span>
          <textarea
            className={styles.textarea}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            minLength={3}
            maxLength={500}
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Стиль</span>
          <select
            className={styles.select}
            value={style}
            onChange={(event) => setStyle(event.target.value)}
          >
            {MUSIC_STYLES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Длительность (сек)</span>
          <input
            className={styles.input}
            type="number"
            min={30}
            max={180}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Образец голоса</span>
          <select
            className={styles.select}
            value={voiceSampleId}
            onChange={(event) => setVoiceSampleId(event.target.value)}
            required
          >
            <option value="">Выберите образец</option>
            {readySamples.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.id.slice(0, 8)}... (Kits: {sample.kitsVoiceModelId})
              </option>
            ))}
          </select>
        </label>

        <button
          className={styles.submit}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Запуск..." : "Сгенерировать"}
        </button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
