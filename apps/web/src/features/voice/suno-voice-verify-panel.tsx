"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import type { VoiceSample } from "@ai-music/shared";
import { MIN_VOICE_VERIFY_DURATION_SEC } from "@ai-music/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isVoiceSampleReadyForGeneration } from "@/entities/voice-sample";
import { useVoiceRecorder } from "@/features/voice/use-voice-recorder";
import { SunoVoiceVerifyTipsPanel } from "@/features/voice/voice-recording-tips-panel";
import { voiceUi } from "@/features/voice/voice-classes";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { usePollingQuery } from "@/shared/hooks/use-polling-query";
import { useApi } from "@/shared/providers/api-provider";
import { VoiceCloneWaitingPanel } from "@/features/voice/voice-clone-waiting-panel";
import { appShell } from "@/shared/theme/app-theme";
import { cn } from "@/lib/utils";

const STATUS_POLL_MS = 3_000;
const MAX_STATUS_POLLS = 120;

class SunoVoicePollTimeoutError extends Error {
  constructor(public readonly cloneStatus: VoiceSample["voiceCloneStatus"]) {
    super("Suno voice poll timeout");
    this.name = "SunoVoicePollTimeoutError";
  }
}

function isVoiceMismatchMessage(message: string | null | undefined): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();

  return (
    normalized.includes("не совпал") ||
    normalized.includes("voices sound different")
  );
}

function resolveStatusLabel(sample: VoiceSample | null): string {
  if (!sample) {
    return "Подготовка...";
  }

  switch (sample.voiceCloneStatus) {
    case "preparing":
      return "Анализируем ваш голос и готовим фразу для верификации...";
    case "awaiting_verification":
      return "Запишите фразу ниже тем же голосом и манерой, что при записи на главной";
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
  const [pollEnabled, setPollEnabled] = useState(false);
  const pollCountRef = useRef(0);
  const {
    elapsedSec,
    error: recorderError,
    isRecording,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  const stopPolling = useCallback(() => {
    setPollEnabled(false);
  }, []);

  const startPolling = useCallback(() => {
    pollCountRef.current = 0;
    setPollEnabled(true);
  }, []);

  const statusQuery = usePollingQuery({
    queryKey: ["suno-voice-status", sampleId],
    queryFn: async () => {
      if (!sampleId) {
        throw new Error("Не указан образец голоса");
      }

      pollCountRef.current += 1;
      const next = await api.voiceSamples.getSunoVoiceStatus(sampleId);

      if (pollCountRef.current > MAX_STATUS_POLLS) {
        throw new SunoVoicePollTimeoutError(next.voiceCloneStatus);
      }

      return next;
    },
    enabled: authReady && Boolean(sampleId) && pollEnabled,
    isTerminal: (data) => Boolean(data && !isProcessingStatus(data.voiceCloneStatus)),
    intervalMs: STATUS_POLL_MS,
  });

  useEffect(() => {
    if (statusQuery.error instanceof SunoVoicePollTimeoutError) {
      const timeoutMessage =
        statusQuery.error.cloneStatus === "cloning"
          ? "Suno не завершил создание голоса за 6 минут. Нажмите «Повторить верификацию» или обновите страницу."
          : "Suno не выдал фразу для записи за 6 минут. Нажмите «Повторить верификацию» или обновите страницу.";
      setError(timeoutMessage);
      stopPolling();
      return;
    }

    if (statusQuery.error) {
      setError(parseApiError(statusQuery.error, "Не удалось настроить голос Suno"));
      stopPolling();
    }
  }, [statusQuery.error, stopPolling]);

  useEffect(() => {
    const next = statusQuery.data;
    if (!next) {
      return;
    }

    setSample(next);

    if (!isProcessingStatus(next.voiceCloneStatus)) {
      stopPolling();
    }
  }, [statusQuery.data, stopPolling]);

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
          setError(parseApiError(bootstrapError, "Не удалось настроить голос Suno"));
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
      return;
    }

    if (sample.voiceCloneStatus === "awaiting_verification") {
      stopPolling();
      return;
    }

    if (isProcessingStatus(sample.voiceCloneStatus) && !pollEnabled) {
      startPolling();
    }
  }, [pollEnabled, router, sample, startPolling, stopPolling]);

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

      if (recording.durationSec < MIN_VOICE_VERIFY_DURATION_SEC) {
        setError(
          `Запись слишком короткая — минимум ${MIN_VOICE_VERIFY_DURATION_SEC} сек. Произнесите фразу целиком.`,
        );
        return;
      }

      const formData = new FormData();
      formData.append("soundFile", recording.file);
      formData.append("durationSec", String(recording.durationSec));

      const verified = await api.voiceSamples.verifySunoVoice(sampleId, formData);
      setSample(verified);

      if (isVoiceSampleReadyForGeneration(verified)) {
        router.push("/music-create");
        return;
      }

      if (verified.voiceCloneStatus === "cloning") {
        startPolling();
        return;
      }

      if (verified.voiceCloneStatus === "awaiting_verification") {
        setError(
          "Запись отправлена, но Suno не начал создание голоса. Обновите страницу или нажмите «Повторить».",
        );
      }
    } catch (submitError) {
      setError(parseApiError(submitError, "Не удалось настроить голос Suno"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!authReady || isBootstrapping) {
    return (
      <div className={appShell.formPage}>
        <div className={cn(appShell.formPageForm, "max-w-xl")}>
          <h1 className={appShell.formPageTitle}>Создание вашего голоса</h1>
          <VoiceCloneWaitingPanel active label="Подготовка Suno Voice..." />
        </div>
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

  const showRecorder =
    sample?.voiceCloneStatus === "awaiting_verification" && !isSubmitting;
  const isBusy = isSubmitting || isProcessingStatus(sample?.voiceCloneStatus ?? "pending");
  const displayError =
    error ??
    (sample?.voiceCloneStatus === "failed"
      ? sample.voiceCloneError ?? "Не удалось создать голос Suno"
      : null);
  const showFailedActions = Boolean(displayError);
  const showVoiceMismatchHint = isVoiceMismatchMessage(displayError);
  const showWaitingPanel =
    isSubmitting ||
    (isProcessingStatus(sample?.voiceCloneStatus ?? "pending") && !isBootstrapping);
  const waitingLabel = isSubmitting
    ? "Отправляем запись верификации в Suno..."
    : resolveStatusLabel(sample);

  function handleRetryPrepare() {
    if (!sampleId) {
      return;
    }

    setError(null);
    pollCountRef.current = 0;
    setIsBootstrapping(true);
    stopPolling();

    void api.voiceSamples
      .prepareSunoVoice(sampleId, { restart: true })
      .then((next) => {
        setSample(next);

        if (isVoiceSampleReadyForGeneration(next)) {
          router.push("/music-create");
          return;
        }

        if (isProcessingStatus(next.voiceCloneStatus)) {
          startPolling();
        }
      })
      .catch((retryError) => setError(parseApiError(retryError, "Не удалось настроить голос Suno")))
      .finally(() => setIsBootstrapping(false));
  }

  return (
    <div className={appShell.formPage}>
      <div className={cn(appShell.formPageForm, "max-w-xl")}>
        <h1 className={appShell.formPageTitle}>Создание вашего голоса</h1>
        {showWaitingPanel ? null : (
          <p className={appShell.formPageDescription}>{resolveStatusLabel(sample)}</p>
        )}

        {showWaitingPanel ? (
          <VoiceCloneWaitingPanel active label={waitingLabel} />
        ) : null}

        {sample?.sunoValidatePhrase && !showWaitingPanel ? (
          <div className={voiceUi.consentContent}>
            <span className={voiceUi.consentTitle}>Фраза для записи</span>
            <span className={voiceUi.consentPhrase}>{sample.sunoValidatePhrase}</span>
          </div>
        ) : null}

        {showRecorder ? <SunoVoiceVerifyTipsPanel /> : null}

        {displayError ? (
          <p className={appShell.formError} role="alert">
            {displayError}
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

        {showFailedActions ? (
          <>
            {showVoiceMismatchHint ? (
              <p className={appShell.formPageDescription}>
                Если на главной вы читали текст, а здесь напевали (или наоборот), Suno
                отклонит запись. Запишите новый образец на главной напевом и
                повторите верификацию тем же голосом.
              </p>
            ) : null}
            <div className={voiceUi.formActions}>
              <button
                className={appShell.formSubmit}
                disabled={isBootstrapping}
                type="button"
                onClick={handleRetryPrepare}
              >
                Повторить верификацию
              </button>
              {showVoiceMismatchHint ? (
                <button
                  className={appShell.btnSecondaryOutline}
                  disabled={isBootstrapping}
                  type="button"
                  onClick={() => router.push("/")}
                >
                  Записать образец заново
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
