"use client";

import { ApiError } from "@ai-music/api-client";
import type { KitsVoiceModel } from "@ai-music/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { appShell } from "@/shared/theme/app-theme";
import { cn } from "@/lib/utils";

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
      <section className={appShell.formPage}>
        <h1 className={appShell.formPageTitle}>Привязка модели Kits</h1>
        <p className={appShell.formError}>Сначала загрузите образец голоса в Music Create.</p>
        <Link className={appShell.formSubmit} href="/music-create">
          Перейти к Music Create
        </Link>
      </section>
    );
  }

  if (!authReady) {
    return <p className={appShell.formStatus}>Загрузка сессии...</p>;
  }

  return (
    <section className={appShell.formPage}>
      <h1 className={appShell.formPageTitle}>Привязка модели Kits</h1>
      <p className={appShell.formPageDescription}>
        Обучите голос на{" "}
        <a href="https://app.kits.ai/voices" target="_blank" rel="noreferrer noopener">
          app.kits.ai
        </a>{" "}
        и укажите Voice Model ID для образца {sampleId}. ID должен принадлежать вашему аккаунту Kits
        (тот же, для которого выдан API key на{" "}
        <a href="https://app.kits.ai/api-access" target="_blank" rel="noreferrer noopener">
          app.kits.ai/api-access
        </a>
        ). Переменная KITS_TEST_VOICE_MODEL_ID в .env используется только на странице kits-test,
        а не на этом шаге.
      </p>

      <form className={appShell.formPageForm} onSubmit={handleSubmit}>
        <label className={appShell.formField}>
          <span className={appShell.formLabel}>Kits Voice Model ID</span>
          <input
            className={appShell.fieldInput}
            value={kitsVoiceModelId}
            onChange={(event) => {
              setKitsVoiceModelId(event.target.value);
              setSelectedModelId(null);
            }}
            inputMode="numeric"
            placeholder="ID вашей модели после обучения на Kits"
          />
        </label>

        {modelsQuery.isLoading ? (
          <p className={appShell.formStatus}>Загрузка ваших моделей Kits...</p>
        ) : null}

        {modelsQuery.isSuccess && modelsQuery.data.data.length > 0 ? (
          <div className={appShell.formField}>
            <span className={appShell.formLabel}>Выберите свою модель</span>
            <div className={appShell.formModelList}>
              {modelsQuery.data.data.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={cn(
                    selectedModelId === model.id
                      ? appShell.formModelOptionSelected
                      : appShell.formModelOption,
                  )}
                  onClick={() => handleSelectModel(model)}
                >
                  {model.title} (ID: {model.id})
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {modelsQuery.isSuccess && modelsQuery.data.data.length === 0 ? (
          <p className={appShell.formHint}>
            В аккаунте Kits пока нет обученных голосов — поэтому список пуст. Создайте модель в
            разделе{" "}
            <a href="https://app.kits.ai/voices" target="_blank" rel="noreferrer noopener">
              Clone Voices
            </a>
            , обновите эту страницу и выберите ID из списка. Не используйте пример 1014961.
          </p>
        ) : null}

        {modelsQuery.error ? (
          <p className={appShell.formHint}>
            Список моделей Kits недоступен — проверьте KITS_API_KEY, платный план API и перезапуск
            API. Введите ID своей модели вручную.
          </p>
        ) : null}

        <button className={appShell.formSubmit} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Сохранение..." : "Привязать модель"}
        </button>
      </form>

      {error ? <p className={appShell.formError}>{error}</p> : null}
    </section>
  );
}
