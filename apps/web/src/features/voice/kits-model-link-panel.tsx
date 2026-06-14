"use client";

import { ApiError } from "@ai-music/api-client";
import type { KitsVoiceModel } from "@ai-music/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
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

  return "Не удалось привязать модель Kits";
}

export function KitsModelLinkPanel() {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sampleId = searchParams.get("id");
  const authReady = useAuthReady();
  const [kitsVoiceModelId, setKitsVoiceModelId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modelsQuery = useQuery({
    queryKey: ["kits", "voice-models", "my"],
    queryFn: () => api.kits.listVoiceModels({ myModels: true, perPage: 20 }),
    enabled: authReady,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!sampleId) {
      setError("Не указан образец голоса");
      return;
    }

    const modelId = selectedModelId ?? Number(kitsVoiceModelId);

    if (!Number.isFinite(modelId) || modelId <= 0) {
      setError("Укажите корректный Kits Voice Model ID");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.voiceSamples.linkKitsModel(sampleId, {
        kitsVoiceModelId: modelId,
      });
      router.push("/music-create");
    } catch (submitError) {
      setError(resolveErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSelectModel(model: KitsVoiceModel) {
    setSelectedModelId(model.id);
    setKitsVoiceModelId(String(model.id));
  }

  if (!sampleId) {
    return (
      <section className={styles.section}>
        <h1 className={styles.title}>Привязка модели Kits</h1>
        <p className={styles.error}>Сначала загрузите образец голоса в Music Create.</p>
        <Link href="/music-create" className={styles.submit}>
          Перейти к Music Create
        </Link>
      </section>
    );
  }

  if (!authReady) {
    return <p className={styles.status}>Загрузка сессии...</p>;
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Привязка модели Kits</h1>
      <p className={styles.description}>
        Обучите голос на{" "}
        <a href="https://app.kits.ai/voices" target="_blank" rel="noreferrer noopener">
          app.kits.ai
        </a>{" "}
        и укажите Voice Model ID для образца {sampleId}.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>Kits Voice Model ID</span>
          <input
            className={styles.input}
            value={kitsVoiceModelId}
            onChange={(event) => {
              setKitsVoiceModelId(event.target.value);
              setSelectedModelId(null);
            }}
            inputMode="numeric"
            placeholder="Например, 1014961"
          />
        </label>

        {modelsQuery.isLoading ? (
          <p className={styles.status}>Загрузка ваших моделей Kits...</p>
        ) : null}

        {modelsQuery.data?.data.length ? (
          <div className={styles.field}>
            <span className={styles.label}>Или выберите из ваших моделей</span>
            <div className={styles.modelList}>
              {modelsQuery.data.data.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={`${styles.modelOption} ${
                    selectedModelId === model.id ? styles.modelOptionSelected : ""
                  }`}
                  onClick={() => handleSelectModel(model)}
                >
                  {model.title} (ID: {model.id})
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {modelsQuery.error ? (
          <p className={styles.hint}>Список моделей недоступен — введите ID вручную.</p>
        ) : null}

        <button className={styles.submit} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Сохранение..." : "Привязать модель"}
        </button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
