"use client";

import { ApiError } from "@ai-music/api-client";
import type { VoiceSample } from "@ai-music/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isVoiceSampleReadyForGeneration } from "@/entities/voice-sample";
import { useVoiceRecorder } from "@/features/voice/use-voice-recorder";
import { voiceUi } from "@/features/voice/voice-classes";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { LoadingPanel } from "@/shared/ui/elevenlabs";
import { appShell } from "@/shared/theme/app-theme";
import { cn } from "@/lib/utils";

const STATUS_POLL_MS = 3_000;
const MAX_STATUS_POLLS = 120;

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

  return "Не удалось настроить голос Suno";
}

function resolveStatusLabel(sample: VoiceSample | null): string {
  if (!sample) {
    return "Подготовка...";
  }

  switch (sample.voiceCloneStatus) {
    case "preparing":
      return "Анализируем ваш голос и готовим фразу для верификации...";
    case "awaiting_verification":
      return "Запишите фразу ниже — лучше напевом, не просто речью";
    case "cloning":
      return "Создаём ваш голос в Suno...";
    case "ready":
      return "Голос готов";
    case "failed":
      return sample.voiceCloneError ?? "Не удалось создать голос";
    default:
      return "Подготовка голоса...";
  }
}

function isProcessingStatus(status: VoiceSample["voiceCloneStatus"]): boolean {
  return status === "preparing" || status === "cloning" || status === "pending";
}

export function SunoVoiceVerifyPanel() {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sampleId = searchParams.get("id");
  const authReady = useAuthReady();
  const [sample, setSample] = useState<VoiceSample | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const {
    elapsedSec,
    error: recorderError,
    isRecording,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!sampleId) {
      return null;
    }

    pollCountRef.current += 1;

    if (pollCountRef.current > MAX_STATUS_POLLS) {
      stopPolling();
      setError(
        "Suno Voice не ответил вовремя (около 6 мин). Обновите страницу или нажмите «Повторить».",
      );
      return null;
    }

    const next = await api.voiceSamples.getSunoVoiceStatus(sampleId);
    setSample(next);
    return next;
  }, [api, sampleId, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollCountRef.current = 0;
    pollTimerRef.current = setInterval(() => {
      void refreshStatus().catch((pollError) => {
        setError(resolveErrorMessage(pollError));
        stopPolling();
      });
    }, STATUS_POLL_MS);
  }, [refreshStatus, stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  useEffect(() => {
    if (!authReady || !sampleId) {
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setIsBootstrapping(true);
      setError(null);

      try {
        const prepared = await api.voiceSamples.prepareSunoVoice(sampleId!);

        if (cancelled) {
          return;
        }

        setSample(prepared);

        if (isVoiceSampleReadyForGeneration(prepared)) {
          router.push("/music-create");
          return;
        }

        if (isProcessingStatus(prepared.voiceCloneStatus)) {
          startPolling();
        }
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(resolveErrorMessage(bootstrapError));
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [api, authReady, router, sampleId, startPolling]);

  useEffect(() => {
    if (!sample) {
      return;
    }

    if (isVoiceSampleReadyForGeneration(sample)) {
      stopPolling();
      router.push("/music-create");
      return;
    }

    if (sample.voiceCloneStatus === "failed") {
      stopPolling();
      setError(sample.voiceCloneError ?? "Не удалось создать голос Suno");
      return;
    }

    if (isProcessingStatus(sample.voiceCloneStatus) && !pollTimerRef.current) {
      startPolling();
    }

    if (sample.voiceCloneStatus === "awaiting_verification") {
      stopPolling();
    }
  }, [router, sample, startPolling, stopPolling]);

  async function handleVerifySubmit() {
    if (!sampleId) {
      setError("Не указан образец голоса");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const recording = await stopRecording();

      if (!recording) {
        setError("Сначала запишите фразу верификации");
        return;
      }

      const formData = new FormData();
      formData.append("soundFile", recording.file);

      const verified = await api.voiceSamples.verifySunoVoice(sampleId, formData);
      setSample(verified);

      if (isVoiceSampleReadyForGeneration(verified)) {
        router.push("/music-create");
        return;
      }

      if (verified.voiceCloneStatus === "cloning") {
        startPolling();
      }
    } catch (submitError) {
      setError(resolveErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!authReady || isBootstrapping) {
    return (
      <div className={appShell.formPage}>
        <p className={appShell.formPageDescription}>Подготовка Suno Voice...</p>
        <LoadingPanel lines={2} />
      </div>
    );
  }

  if (!sampleId) {
    return (
      <div className={appShell.formPage}>
        <p className={appShell.formError}>Не указан образец голоса</p>
      </div>
    );
  }

  const showRecorder = sample?.voiceCloneStatus === "awaiting_verification";
  const isBusy = isSubmitting || isProcessingStatus(sample?.voiceCloneStatus ?? "pending");

  return (
    <div className={appShell.formPage}>
      <div className={cn(appShell.formPageForm, "max-w-xl")}>
        <h1 className={appShell.formPageTitle}>Создание вашего голоса</h1>
        <p className={appShell.formPageDescription}>{resolveStatusLabel(sample)}</p>

        {sample?.sunoValidatePhrase ? (
          <div className={voiceUi.consentContent}>
            <span className={voiceUi.consentTitle}>Фраза для записи</span>
            <span className={voiceUi.consentPhrase}>{sample.sunoValidatePhrase}</span>
          </div>
        ) : null}

        {error ? (
          <p className={appShell.formError} role="alert">
            {error}
          </p>
        ) : null}

        {recorderError ? (
          <p className={appShell.formError} role="alert">
            {recorderError}
          </p>
        ) : null}

        {showRecorder ? (
          <div className={appShell.formField}>
            {!isRecording ? (
              <button
                className={appShell.formSubmit}
                disabled={isBusy}
                type="button"
                onClick={() => {
                  void startRecording();
                }}
              >
                Начать запись фразы
              </button>
            ) : (
              <button
                className={appShell.formSubmit}
                disabled={isBusy}
                type="button"
                onClick={() => {
                  void handleVerifySubmit();
                }}
              >
                {isSubmitting ? "Отправка..." : `Остановить и отправить (${elapsedSec} с)`}
              </button>
            )}
          </div>
        ) : null}

        {sample?.voiceCloneStatus === "cloning" ? (
          <>
            <p className={appShell.formPageDescription}>Создаём голос Suno...</p>
            <LoadingPanel lines={2} />
          </>
        ) : null}

        {sample?.voiceCloneStatus === "failed" ? (
          <button
            className={appShell.formSubmit}
            type="button"
            onClick={() => {
              setError(null);
              pollCountRef.current = 0;
              setIsBootstrapping(true);
              void api.voiceSamples
                .prepareSunoVoice(sampleId)
                .then((next) => setSample(next))
                .catch((retryError) => setError(resolveErrorMessage(retryError)))
                .finally(() => setIsBootstrapping(false));
            }}
          >
            Повторить
          </button>
        ) : null}
      </div>
    </div>
  );
}
