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
const PHRASE_SYNC_POLL_MS = 15_000;
const MAX_STATUS_POLLS = 120;
const STUCK_WAIT_SEC = 120;
const VOICE_SETUP_ERROR = "Не удалось настроить голос AI Music";

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
  onSampleChange?: (sample: VoiceSample) => void;
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
      return "Создаём ваш голос в AI Music...";
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

function shouldPollVoiceStatus(status: VoiceSample["voiceCloneStatus"]): boolean {
  return isProcessingStatus(status) || status === "awaiting_verification";
}

function resolvePollIntervalMs(status: VoiceSample["voiceCloneStatus"] | undefined): number {
  return status === "awaiting_verification" ? PHRASE_SYNC_POLL_MS : STATUS_POLL_MS;
}

function resolvePollError(queryError: Error | null | undefined): string | null {
  if (!queryError) {
    return null;
  }

  if (queryError instanceof SunoVoicePollTimeoutError) {
    return queryError.cloneStatus === "cloning"
      ? "AI Music не завершил создание голоса за 6 минут. Нажмите «Повторить верификацию» или обновите страницу."
      : "AI Music не выдал фразу за 6 минут. Нажмите «Повторить верификацию» или загрузите образец заново.";
  }

  return parseApiError(queryError, VOICE_SETUP_ERROR);
}

export function SunoVoiceVerifyFlow({
  sampleId,
  variant = "page",
  onVoiceReady,
  onRecordNewSample,
  onSampleChange,
}: SunoVoiceVerifyFlowProps) {
  const api = useApi();
  const router = useRouter();
  const authReady = useAuthReady();
  const isInline = variant === "inline";
  const [sample, setSample] = useState<VoiceSample | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [pollRequested, setPollRequested] = useState(false);
  const [waitElapsedSec, setWaitElapsedSec] = useState(0);
  const pollCountRef = useRef(0);
  const bootstrappedSampleIdRef = useRef<string | null>(null);
  const onVoiceReadyRef = useRef(onVoiceReady);
  const onRecordNewSampleRef = useRef(onRecordNewSample);
  const onSampleChangeRef = useRef(onSampleChange);
  const apiRef = useRef(api);

  useEffect(() => {
    apiRef.current = api;
    onVoiceReadyRef.current = onVoiceReady;
    onRecordNewSampleRef.current = onRecordNewSample;
    onSampleChangeRef.current = onSampleChange;
  }, [api, onVoiceReady, onRecordNewSample, onSampleChange]);

  const {
    elapsedSec,
    error: recorderError,
    isRecording,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  const stopPolling = useCallback(() => {
    setPollRequested(false);
  }, []);

  const startPolling = useCallback(() => {
    pollCountRef.current = 0;
    setPollRequested(true);
  }, []);

  const handleWaitElapsedChange = useCallback((elapsedSec: number) => {
    setWaitElapsedSec(elapsedSec);
  }, []);

  const handleVoiceReady = useCallback(() => {
    if (onVoiceReadyRef.current) {
      onVoiceReadyRef.current();
      return;
    }

    router.push("/music-create");
  }, [router]);

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
    enabled: authReady && Boolean(sampleId) && pollRequested,
    isTerminal: (data) => Boolean(data && !shouldPollVoiceStatus(data.voiceCloneStatus)),
    intervalMs: STATUS_POLL_MS,
    resolveIntervalMs: (data) => resolvePollIntervalMs(data?.voiceCloneStatus),
  });

  const resolvedSample = statusQuery.data ?? sample;
  const pollError = resolvePollError(statusQuery.error);
  const isWaitingForSuno =
    isSubmitting ||
    (isProcessingStatus(resolvedSample?.voiceCloneStatus ?? "pending") && !isBootstrapping);

  useEffect(() => {
    if (!resolvedSample) {
      return;
    }

    onSampleChangeRef.current?.(resolvedSample);
  }, [resolvedSample]);

  useEffect(() => {
    if (!resolvedSample || !isVoiceSampleReadyForGeneration(resolvedSample) || isInline) {
      return;
    }

    handleVoiceReady();
  }, [handleVoiceReady, isInline, resolvedSample]);

  useEffect(() => {
    if (!authReady || !sampleId) {
      return;
    }

    if (bootstrappedSampleIdRef.current === sampleId) {
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setIsBootstrapping(true);
      setError(null);

      try {
        const current = await apiRef.current.voiceSamples.getSunoVoiceStatus(sampleId!);

        if (cancelled) {
          return;
        }

        setSample(current);

        if (isVoiceSampleReadyForGeneration(current)) {
          handleVoiceReady();
          bootstrappedSampleIdRef.current = sampleId;
          return;
        }

        if (current.voiceCloneStatus === "failed") {
          bootstrappedSampleIdRef.current = sampleId;
          return;
        }

        if (current.voiceCloneStatus === "awaiting_verification") {
          startPolling();
          bootstrappedSampleIdRef.current = sampleId;
          return;
        }

        const prepared = shouldAutoPrepare(current.voiceCloneStatus)
          ? await apiRef.current.voiceSamples.prepareSunoVoice(sampleId!)
          : current;

        if (cancelled) {
          return;
        }

        setSample(prepared);

        if (isVoiceSampleReadyForGeneration(prepared)) {
          handleVoiceReady();
          bootstrappedSampleIdRef.current = sampleId;
          return;
        }

        if (isProcessingStatus(prepared.voiceCloneStatus)) {
          startPolling();
        }

        bootstrappedSampleIdRef.current = sampleId;
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(parseApiError(bootstrapError, VOICE_SETUP_ERROR));
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
  }, [authReady, handleVoiceReady, sampleId, startPolling]);

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
          "Запись отправлена, но AI Music не начал создание голоса. Обновите страницу или нажмите «Повторить».",
        );
      }
    } catch (submitError) {
      setError(parseApiError(submitError, VOICE_SETUP_ERROR));

      try {
        const refreshed = await api.voiceSamples.getSunoVoiceStatus(sampleId);
        setSample(refreshed);

        if (refreshed.voiceCloneStatus === "failed") {
          stopPolling();
        }
      } catch {
        // status refresh is best-effort after submit failure
      }
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
    bootstrappedSampleIdRef.current = null;

    void apiRef.current.voiceSamples
      .prepareSunoVoice(sampleId, { restart: true })
      .then((next) => {
        setSample(next);

        if (isVoiceSampleReadyForGeneration(next)) {
          handleVoiceReady();
          return;
        }

        if (isProcessingStatus(next.voiceCloneStatus)) {
          startPolling();
          return;
        }

        if (next.voiceCloneStatus === "awaiting_verification") {
          startPolling();
        }
      })
      .catch((retryError) => setError(parseApiError(retryError, VOICE_SETUP_ERROR)))
      .finally(() => {
        setIsBootstrapping(false);
        if (sampleId) {
          bootstrappedSampleIdRef.current = sampleId;
        }
      });
  }

  function handleStopVerification() {
    if (!sampleId) {
      return;
    }

    setError(null);
    setIsCancelling(true);
    stopPolling();
    setIsSubmitting(false);

    void apiRef.current.voiceSamples
      .cancelSunoVoice(sampleId)
      .then((cancelled) => {
        setSample(cancelled);
      })
      .catch((cancelError) => {
        setError(parseApiError(cancelError, VOICE_SETUP_ERROR));
      })
      .finally(() => {
        setIsCancelling(false);
      });
  }

  function handleRecordNewSample() {
    if (onRecordNewSampleRef.current) {
      onRecordNewSampleRef.current();
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
        <VoiceCloneWaitingPanel active label="Подготовка AI-Voice..." />
      </div>,
    );
  }

  if (!sampleId) {
    return renderShell(<p className={appShell.formError}>Не указан образец голоса</p>);
  }

  const showRecorder =
    resolvedSample?.voiceCloneStatus === "awaiting_verification" && !isSubmitting;
  const isBusy =
    isSubmitting ||
    isCancelling ||
    isProcessingStatus(resolvedSample?.voiceCloneStatus ?? "pending");
  const displayError =
    error ??
    pollError ??
    (resolvedSample?.voiceCloneStatus === "failed"
      ? resolvedSample.voiceCloneError ?? "Не удалось создать голос AI Music"
      : null);
  const showFailedActions = Boolean(displayError);
  const showStuckActions = isWaitingForSuno && waitElapsedSec >= STUCK_WAIT_SEC;
  const showRecoveryActions = showFailedActions || showStuckActions;
  const showVoiceMismatchHint = isVoiceMismatchMessage(displayError);
  const showWaitingPanel = isWaitingForSuno;
  const waitingLabel = isSubmitting
    ? "Отправляем запись верификации в AI Music..."
    : resolveStatusLabel(resolvedSample);
  const isReady = resolvedSample ? isVoiceSampleReadyForGeneration(resolvedSample) : false;

  const shellContent = (
    <div className={formClassName}>
        {isInline ? (
          <h2 className={titleClassName}>Верификация голоса</h2>
        ) : (
          <h1 className={titleClassName}>Создание вашего голоса</h1>
        )}
        {showWaitingPanel ? null : (
          <p className={descriptionClassName}>{resolveStatusLabel(resolvedSample)}</p>
        )}

        {showWaitingPanel ? (
          <>
            <VoiceCloneWaitingPanel
              active
              label={waitingLabel}
              onElapsedChange={handleWaitElapsedChange}
            />
            <div className={voiceUi.formActions}>
              <button
                className={voiceUi.upload.toolButtonDestructive}
                disabled={isCancelling || isBootstrapping}
                type="button"
                onClick={handleStopVerification}
              >
                {isCancelling ? "Остановка..." : "Стоп"}
              </button>
            </div>
          </>
        ) : null}

        {resolvedSample?.sunoValidatePhrase &&
        resolvedSample.voiceCloneStatus === "awaiting_verification" &&
        !showWaitingPanel ? (
          <div className={voiceUi.consentContent}>
            <span className={voiceUi.consentTitle}>Фраза для записи</span>
            <span className={voiceUi.consentPhrase}>{resolvedSample.sunoValidatePhrase}</span>
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

        {showRecoveryActions ? (
          <>
            {showVoiceMismatchHint ? (
              <p className={descriptionClassName}>
                Если при записи образца вы читали текст, а здесь напевали (или наоборот), AI Music
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
              <button
                className={appShell.btnSecondaryOutline}
                disabled={isBootstrapping}
                type="button"
                onClick={handleRecordNewSample}
              >
                Записать образец заново
              </button>
            </div>
          </>
        ) : null}
    </div>
  );

  return renderShell(shellContent);
}
