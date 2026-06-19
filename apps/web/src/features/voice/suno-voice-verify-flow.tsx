"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import type { VoiceSample } from "@ai-music/shared";
import { MIN_VOICE_VERIFY_DURATION_SEC } from "@ai-music/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

export interface SunoVoiceVerifyFlowProps {
  sampleId: string | null;
  variant?: "page" | "inline";
  onVoiceReady?: () => void;
  onRecordNewSample?: () => void;
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
      return "Запишите фразу ниже тем же голосом и манерой, что при записи образца";
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

function shouldAutoPrepare(status: VoiceSample["voiceCloneStatus"]): boolean {
  return status === "pending" || status === "preparing" || status === "cloning";
}

function isProcessingStatus(status: VoiceSample["voiceCloneStatus"]): boolean {
  return status === "preparing" || status === "cloning" || status === "pending";
}

export function SunoVoiceVerifyFlow({
  sampleId,
  variant = "page",
  onVoiceReady,
  onRecordNewSample,
}: SunoVoiceVerifyFlowProps) {
  const api = useApi();
  const router = useRouter();
  const authReady = useAuthReady();
  const isInline = variant === "inline";
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

  const handleVoiceReady = useCallback(() => {
    if (onVoiceReady) {
      onVoiceReady();
      return;
    }

    router.push("/music-create");
  }, [onVoiceReady, router]);

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
          : "Suno не выдал фразу за 6 минут. Нажмите «Повторить верификацию» или загрузите образец заново.";
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
        const current = await api.voiceSamples.getSunoVoiceStatus(sampleId!);

        if (cancelled) {
          return;
        }

        setSample(current);

        if (isVoiceSampleReadyForGeneration(current)) {
          handleVoiceReady();
          return;
        }

        if (current.voiceCloneStatus === "failed" || current.voiceCloneStatus === "awaiting_verification") {
          return;
        }

        const prepared = shouldAutoPrepare(current.voiceCloneStatus)
          ? await api.voiceSamples.prepareSunoVoice(sampleId!)
          : current;

        if (cancelled) {
          return;
        }

        setSample(prepared);

        if (isVoiceSampleReadyForGeneration(prepared)) {
          handleVoiceReady();
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
  }, [api, authReady, handleVoiceReady, sampleId, startPolling]);

  useEffect(() => {
    if (!sample) {
      return;
    }

    if (isVoiceSampleReadyForGeneration(sample)) {
      stopPolling();

      if (!isInline) {
        handleVoiceReady();
      }

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
  }, [handleVoiceReady, isInline, pollEnabled, sample, startPolling, stopPolling]);

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
        handleVoiceReady();
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
          handleVoiceReady();
          return;
        }

        if (isProcessingStatus(next.voiceCloneStatus)) {
          startPolling();
        }
      })
      .catch((retryError) => setError(parseApiError(retryError, "Не удалось настроить голос Suno")))
      .finally(() => setIsBootstrapping(false));
  }

  function handleRecordNewSample() {
    if (onRecordNewSample) {
      onRecordNewSample();
      return;
    }

    router.push("/");
  }

  const shellClassName = isInline ? voiceUi.verifyInlineShell : appShell.formPage;
  const formClassName = isInline
    ? voiceUi.verifyInlineForm
    : cn(appShell.formPageForm, "max-w-xl");
  const titleClassName = isInline ? voiceUi.verifyInlineTitle : appShell.formPageTitle;
  const descriptionClassName = isInline
    ? voiceUi.verifyInlineDescription
    : appShell.formPageDescription;

  function renderShell(content: ReactNode) {
    return <div className={shellClassName}>{content}</div>;
  }

  if (!authReady || isBootstrapping) {
    return renderShell(
      <div className={formClassName}>
        {!isInline ? <h1 className={titleClassName}>Создание вашего голоса</h1> : null}
        <VoiceCloneWaitingPanel active label="Подготовка Suno Voice..." />
      </div>,
    );
  }

  if (!sampleId) {
    return renderShell(<p className={appShell.formError}>Не указан образец голоса</p>);
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
  const isReady = sample ? isVoiceSampleReadyForGeneration(sample) : false;

  const shellContent = (
    <div className={formClassName}>
        {isInline ? (
          <h2 className={titleClassName}>Верификация голоса</h2>
        ) : (
          <h1 className={titleClassName}>Создание вашего голоса</h1>
        )}
        {showWaitingPanel ? null : (
          <p className={descriptionClassName}>{resolveStatusLabel(sample)}</p>
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

        {isReady && isInline ? (
          <div className={voiceUi.verifyReadyActions}>
            <p className={descriptionClassName}>
              Голос верифицирован и готов к генерации музыки.
            </p>
            <Link className={appShell.formSubmit} href="/music-create">
              Перейти к созданию трека
            </Link>
          </div>
        ) : null}

        {showFailedActions ? (
          <>
            {showVoiceMismatchHint ? (
              <p className={descriptionClassName}>
                Если при записи образца вы читали текст, а здесь напевали (или наоборот), Suno
                отклонит запись. Запишите новый образец напевом и повторите верификацию тем же
                голосом.
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
                  onClick={handleRecordNewSample}
                >
                  Записать образец заново
                </button>
              ) : null}
            </div>
          </>
        ) : null}
    </div>
  );

  return renderShell(shellContent);
}
