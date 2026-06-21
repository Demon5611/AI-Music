"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import type { VoiceSample } from "@ai-music/shared";
import { MIN_VOICE_VERIFY_DURATION_SEC } from "@ai-music/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isVoiceSampleReadyForGeneration, isVoiceCloneCancelled, needsPersonaReverification } from "@/entities/voice-sample";
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
    case "pending":
      return "Нажмите «Начать верификацию», чтобы AI Music подготовил фразу для записи.";
    case "preparing":
      return "Анализируем ваш голос и готовим фразу для верификации...";
    case "awaiting_verification":
      return "Запишите фразу ниже тем же голосом и манерой, что при записи образца";
    case "cloning":
      return "Создаём ваш голос в AI Music...";
    case "ready":
      if (needsPersonaReverification(sample)) {
        return "AI Music не подтвердил голос для генерации музыки. Нажмите «Повторить верификацию» — образец на главной сохранён.";
      }

      return "Голос готов";
    case "failed":
      return sample.voiceCloneError ?? "Не удалось создать голос";
    default:
      return "Подготовка голоса...";
  }
}

function isRecoverableVoiceCloneFailure(sample: VoiceSample): boolean {
  if (sample.voiceCloneStatus !== "failed" || isVoiceCloneCancelled(sample)) {
    return false;
  }

  const message = sample.voiceCloneError ?? "";

  return (
    message.includes("Фраза верификации истекла") ||
    message.includes("не вернул текст фразы") ||
    message.includes("не выдал фразу") ||
    message.includes("Повторить верификацию")
  );
}

function shouldAutoPrepare(status: VoiceSample["voiceCloneStatus"]): boolean {
  return status === "pending";
}

function isProcessingStatus(status: VoiceSample["voiceCloneStatus"]): boolean {
  return status === "preparing" || status === "cloning";
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
  const queryClient = useQueryClient();
  const router = useRouter();
  const authReady = useAuthReady();
  const isInline = variant === "inline";
  const [sample, setSample] = useState<VoiceSample | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRetryingPrepare, setIsRetryingPrepare] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [pollRequested, setPollRequested] = useState(false);
  const [waitElapsedSec, setWaitElapsedSec] = useState(0);
  const pollCountRef = useRef(0);
  const bootstrappedSampleIdRef = useRef<string | null>(null);
  const prepareInFlightRef = useRef(false);
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

  const startPolling = useCallback((debugReason: string) => {
    // #region agent log
    fetch("http://127.0.0.1:7689/ingest/393e7dad-6c29-4254-ab78-3b3c45dc5137", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "543522" },
      body: JSON.stringify({
        sessionId: "543522",
        hypothesisId: "B-C",
        location: "suno-voice-verify-flow.tsx:startPolling",
        message: "startPolling",
        data: { debugReason, sampleId },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    pollCountRef.current = 0;
    setPollRequested(true);
  }, [sampleId]);

  const resumeStatusPolling = useCallback(
    (debugReason: string) => {
      if (!sampleId) {
        return;
      }

      setError(null);
      pollCountRef.current = 0;
      void queryClient.removeQueries({ queryKey: ["suno-voice-status", sampleId] });
      startPolling(debugReason);
    },
    [queryClient, sampleId, startPolling],
  );

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
    if (!statusQuery.data) {
      return;
    }

    setSample(statusQuery.data);

    // #region agent log
    fetch("http://127.0.0.1:7689/ingest/393e7dad-6c29-4254-ab78-3b3c45dc5137", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "543522" },
      body: JSON.stringify({
        sessionId: "543522",
        hypothesisId: "B",
        location: "suno-voice-verify-flow.tsx:poll:status",
        message: "poll status update",
        data: {
          sampleId,
          voiceCloneStatus: statusQuery.data.voiceCloneStatus,
          voiceCloneError: statusQuery.data.voiceCloneError,
          pollCount: pollCountRef.current,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (
      statusQuery.data.voiceCloneStatus !== "failed" ||
      isVoiceCloneCancelled(statusQuery.data)
    ) {
      if (statusQuery.data.voiceCloneStatus !== "failed") {
        setError(null);
      }
    }

    if (isVoiceCloneCancelled(statusQuery.data)) {
      stopPolling();
    }
  }, [statusQuery.data, stopPolling]);

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
      setIsBootstrapping(false);
      return;
    }

    if (prepareInFlightRef.current) {
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      // #region agent log
      fetch("http://127.0.0.1:7689/ingest/393e7dad-6c29-4254-ab78-3b3c45dc5137", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "543522" },
        body: JSON.stringify({
          sessionId: "543522",
          hypothesisId: "A-D",
          location: "suno-voice-verify-flow.tsx:bootstrap:start",
          message: "bootstrap started",
          data: { sampleId, bootstrappedRef: bootstrappedSampleIdRef.current },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setIsBootstrapping(true);
      setError(null);

      try {
        const current = await apiRef.current.voiceSamples.getSunoVoiceStatus(sampleId!);

        if (cancelled) {
          return;
        }

        setSample(current);

        // #region agent log
        fetch("http://127.0.0.1:7689/ingest/393e7dad-6c29-4254-ab78-3b3c45dc5137", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "543522" },
          body: JSON.stringify({
            sessionId: "543522",
            hypothesisId: "A-B-C",
            location: "suno-voice-verify-flow.tsx:bootstrap:status",
            message: "bootstrap initial status",
            data: {
              sampleId,
              voiceCloneStatus: current.voiceCloneStatus,
              voiceCloneError: current.voiceCloneError,
              recoverable: isRecoverableVoiceCloneFailure(current),
              willAutoPrepare: shouldAutoPrepare(current.voiceCloneStatus),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        if (isVoiceSampleReadyForGeneration(current)) {
          handleVoiceReady();
          bootstrappedSampleIdRef.current = sampleId;
          return;
        }

        if (current.voiceCloneStatus === "failed") {
          if (isVoiceCloneCancelled(current)) {
            bootstrappedSampleIdRef.current = sampleId;
            return;
          }

          if (isRecoverableVoiceCloneFailure(current)) {
            // Stay on failed UI — user restarts via button; polling sync kept failing state.
          }

          bootstrappedSampleIdRef.current = sampleId;
          return;
        }

        if (current.voiceCloneStatus === "pending") {
          bootstrappedSampleIdRef.current = sampleId;
          return;
        }

        if (
          current.voiceCloneStatus === "preparing" ||
          current.voiceCloneStatus === "cloning"
        ) {
          setSample(current);
          startPolling("bootstrap:preparing-or-cloning");
          bootstrappedSampleIdRef.current = sampleId;
          return;
        }

        if (current.voiceCloneStatus === "awaiting_verification") {
          startPolling("bootstrap:awaiting-verification");
          bootstrappedSampleIdRef.current = sampleId;
          return;
        }

        bootstrappedSampleIdRef.current = sampleId;
      } catch (bootstrapError) {
        if (!cancelled) {
          bootstrappedSampleIdRef.current = null;
          setError(parseApiError(bootstrapError, VOICE_SETUP_ERROR));
        }
      } finally {
        // #region agent log
        fetch("http://127.0.0.1:7689/ingest/393e7dad-6c29-4254-ab78-3b3c45dc5137", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "543522" },
          body: JSON.stringify({
            sessionId: "543522",
            hypothesisId: "H-bootstrap",
            location: "suno-voice-verify-flow.tsx:bootstrap:finally",
            message: "bootstrap finished",
            data: { sampleId, cancelled, bootstrapped: bootstrappedSampleIdRef.current === sampleId },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        setIsBootstrapping(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [authReady, handleVoiceReady, sampleId, startPolling]);

  async function handleVerifySubmit() {
    // #region agent log
    fetch("http://127.0.0.1:7689/ingest/393e7dad-6c29-4254-ab78-3b3c45dc5137", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "543522" },
      body: JSON.stringify({
        sessionId: "543522",
        hypothesisId: "E",
        location: "suno-voice-verify-flow.tsx:handleVerifySubmit",
        message: "verify submit invoked",
        data: { sampleId },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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
        startPolling("verify-submit:cloning");
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

  function runPrepare(restart: boolean, debugReason: string) {
    if (!sampleId || isRetryingPrepare) {
      return;
    }

    setError(null);
    pollCountRef.current = 0;
    setIsBootstrapping(true);
    setIsRetryingPrepare(true);
    prepareInFlightRef.current = true;
    stopPolling();
    bootstrappedSampleIdRef.current = sampleId;

    void queryClient.removeQueries({ queryKey: ["suno-voice-status", sampleId] });

    void apiRef.current.voiceSamples
      .prepareSunoVoice(sampleId, restart ? { restart: true } : undefined)
      .then((next) => {
        setSample(next);

        if (isVoiceSampleReadyForGeneration(next)) {
          handleVoiceReady();
          return;
        }

        if (isProcessingStatus(next.voiceCloneStatus)) {
          startPolling(debugReason);
          return;
        }

        if (next.voiceCloneStatus === "awaiting_verification") {
          startPolling(`${debugReason}:awaiting`);
        }
      })
      .catch((retryError) => setError(parseApiError(retryError, VOICE_SETUP_ERROR)))
      .finally(() => {
        setIsBootstrapping(false);
        setIsRetryingPrepare(false);
        prepareInFlightRef.current = false;
        bootstrappedSampleIdRef.current = sampleId;
      });
  }

  function handleStartPrepare() {
    // #region agent log
    fetch("http://127.0.0.1:7689/ingest/393e7dad-6c29-4254-ab78-3b3c45dc5137", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "543522" },
      body: JSON.stringify({
        sessionId: "543522",
        hypothesisId: "A-fix",
        location: "suno-voice-verify-flow.tsx:handleStartPrepare",
        message: "start prepare clicked",
        data: { sampleId },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    runPrepare(false, "start-prepare:processing");
  }

  function handleRetryPrepare() {
    // #region agent log
    fetch("http://127.0.0.1:7689/ingest/393e7dad-6c29-4254-ab78-3b3c45dc5137", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "543522" },
      body: JSON.stringify({
        sessionId: "543522",
        hypothesisId: "D",
        location: "suno-voice-verify-flow.tsx:handleRetryPrepare",
        message: "retry prepare clicked",
        data: {
          sampleId,
          isRetryingPrepare,
          voiceCloneStatus: resolvedSample?.voiceCloneStatus ?? null,
          hasPhrase: Boolean(resolvedSample?.sunoValidatePhrase?.trim()),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!sampleId || isRetryingPrepare) {
      return;
    }

    if (
      resolvedSample?.voiceCloneStatus === "awaiting_verification" &&
      resolvedSample.sunoValidatePhrase?.trim()
    ) {
      resumeStatusPolling("retry:resume-awaiting");
      return;
    }

    runPrepare(true, "retry-prepare:processing");
  }

  function handleStopVerification() {
    if (!sampleId || isCancelling) {
      return;
    }

    setError(null);
    setIsCancelling(true);
    stopPolling();
    setIsSubmitting(false);

    void queryClient.cancelQueries({ queryKey: ["suno-voice-status", sampleId] });
    void queryClient.removeQueries({ queryKey: ["suno-voice-status", sampleId] });

    void apiRef.current.voiceSamples
      .cancelSunoVoice(sampleId)
      .then((cancelled) => {
        setSample(cancelled);
        bootstrappedSampleIdRef.current = sampleId;
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

  if (!authReady) {
    return renderShell(
      <div className={formClassName}>
        {!isInline ? <h1 className={titleClassName}>Создание вашего голоса</h1> : null}
        <VoiceCloneWaitingPanel active label="Загрузка..." />
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
  const isReady = resolvedSample ? isVoiceSampleReadyForGeneration(resolvedSample) : false;
  const showWaitingPanel = isBootstrapping || isWaitingForSuno;
  const displayError = showWaitingPanel
    ? null
    : error ??
      pollError ??
      (resolvedSample?.voiceCloneStatus === "failed"
        ? resolvedSample.voiceCloneError ?? "Не удалось создать голос AI Music"
        : null);
  const showFailedActions = Boolean(displayError);
  const showStuckActions =
    (isWaitingForSuno || isBootstrapping) && waitElapsedSec >= STUCK_WAIT_SEC;
  const needsReverify = resolvedSample
    ? needsPersonaReverification(resolvedSample)
    : false;
  const showStartVerification =
    resolvedSample?.voiceCloneStatus === "pending" && !showWaitingPanel && !isReady;
  const showRecoveryActions =
    showFailedActions ||
    showStuckActions ||
    needsReverify ||
    (resolvedSample ? isRecoverableVoiceCloneFailure(resolvedSample) : false);
  const showVoiceMismatchHint = isVoiceMismatchMessage(displayError);
  const waitingLabel = isBootstrapping
    ? "Подготовка AI-Voice..."
    : isSubmitting
      ? "Отправляем запись верификации в AI Music..."
      : resolveStatusLabel(resolvedSample);

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
              active={showWaitingPanel}
              label={waitingLabel}
              onElapsedChange={handleWaitElapsedChange}
            />
            <div className={voiceUi.formActions}>
              <button
                className={voiceUi.upload.toolButtonDestructive}
                disabled={isCancelling}
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

        {showStartVerification ? (
          <div className={voiceUi.formActions}>
            <button
              className={appShell.formSubmit}
              disabled={isBootstrapping || isRetryingPrepare}
              type="button"
              onClick={handleStartPrepare}
            >
              {isRetryingPrepare ? "Запуск..." : "Начать верификацию"}
            </button>
            <button
              className={appShell.btnSecondaryOutline}
              disabled={isBootstrapping || isRetryingPrepare}
              type="button"
              onClick={handleRecordNewSample}
            >
              Записать образец заново
            </button>
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
                disabled={isBootstrapping || isRetryingPrepare}
                type="button"
                onClick={handleRetryPrepare}
              >
                {isRetryingPrepare ? "Запуск..." : "Повторить верификацию"}
              </button>
              <button
                className={appShell.btnSecondaryOutline}
                disabled={isBootstrapping || isRetryingPrepare}
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
