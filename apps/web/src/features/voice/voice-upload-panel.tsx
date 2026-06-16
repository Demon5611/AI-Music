"use client";

import { ApiError } from "@ai-music/api-client";
import {
  MAX_VOICE_SAMPLE_DURATION_SEC,
  MIN_VOICE_SAMPLE_DURATION_SEC,
  VOICE_CONSENT_PHRASE,
} from "@ai-music/shared";
import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readAudioDurationSec } from "@/features/voice/read-audio-duration";
import { useVoiceRecorder } from "@/features/voice/use-voice-recorder";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { lp } from "@/features/landing/landing-classes";
import { me as editorStyles } from "@/features/music-editor/music-editor-classes";
import { LoadingPanel } from "@/shared/ui/elevenlabs";
import { appShell } from "@/shared/theme/app-theme";

type VoiceUploadVariant = "page" | "landing";

function resolveVoiceUploadStyles(variant: VoiceUploadVariant) {
  const isLanding = variant === "landing";

  return {
    isLanding,
    isPage: variant === "page",
    form: isLanding ? editorStyles.ownVoiceForm : appShell.formPageForm,
    field: isLanding ? editorStyles.ownVoiceField : appShell.formField,
    label: isLanding ? editorStyles.fieldLabel : appShell.formLabel,
    submit: isLanding ? lp.voiceSubmit : appShell.formSubmit,
    hint: isLanding ? lp.voiceHint : appShell.formPageDescription,
    error: isLanding ? editorStyles.error : appShell.formError,
    consentRow: isLanding ? editorStyles.ownVoiceConsentRow : appShell.formConsentRow,
    consentText: isLanding ? editorStyles.ownVoiceConsentText : appShell.formConsentText,
    consentNotice: isLanding ? editorStyles.ownVoiceConsentNotice : appShell.formConsentNotice,
  };
}

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

function formatRecordingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

type VoiceInputMode = "record" | "upload";

interface VoiceModeButtonProps {
  active: boolean;
  children: string;
  disabled: boolean;
  onSelect: () => void;
}

function VoiceModeButton({ active, children, disabled, onSelect }: VoiceModeButtonProps) {
  const className = active
    ? editorStyles.ownVoiceModeButtonActive
    : editorStyles.ownVoiceModeButton;

  if (active) {
    return (
      <button
        aria-pressed="true"
        className={className}
        disabled={disabled}
        type="button"
        onClick={onSelect}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      aria-pressed="false"
      className={className}
      disabled={disabled}
      type="button"
      onClick={onSelect}
    >
      {children}
    </button>
  );
}

interface VoiceUploadPanelProps {
  disabled?: boolean;
  onSuccess?: (sampleId: string) => void;
  variant?: VoiceUploadVariant;
}

export function VoiceUploadPanel({
  disabled = false,
  onSuccess,
  variant = "page",
}: VoiceUploadPanelProps) {
  const api = useApi();
  const router = useRouter();
  const authReady = useAuthReady();
  const [file, setFile] = useState<File | null>(null);
  const [fileSource, setFileSource] = useState<VoiceInputMode | null>(null);
  const [inputMode, setInputMode] = useState<VoiceInputMode>("record");
  const [pendingInputMode, setPendingInputMode] = useState<VoiceInputMode | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [previewDurationSec, setPreviewDurationSec] = useState<number | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    cancelRecording,
    elapsedSec,
    error: recorderError,
    isRecording,
    setError: setRecorderError,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  const styles = resolveVoiceUploadStyles(variant);
  const { isLanding, isPage } = styles;
  const durationHint = `${MIN_VOICE_SAMPLE_DURATION_SEC}–${MAX_VOICE_SAMPLE_DURATION_SEC} сек`;

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearSelectedFile() {
    setFile(null);
    setFileSource(null);
    setPreviewDurationSec(null);
    setFileInputKey((value) => value + 1);
    setError(null);
  }

  function resetVoiceInput() {
    cancelRecording();
    clearSelectedFile();
    setPendingInputMode(null);
  }

  function selectUploadedFile(nextFile: File | null) {
    if (nextFile && !confirmed) {
      setError("Подтвердите согласие перед загрузкой файла");
      return;
    }

    if (!nextFile) {
      clearSelectedFile();
      return;
    }

    setFile(nextFile);
    setFileSource("upload");
    setPreviewDurationSec(null);
    setError(null);
  }

  function selectRecordedFile(nextFile: File) {
    setFile(nextFile);
    setFileSource("record");
    setPreviewDurationSec(null);
    setError(null);
  }

  function requestInputMode(nextMode: VoiceInputMode) {
    if (nextMode === inputMode) {
      return;
    }

    if (file || isRecording) {
      setPendingInputMode(nextMode);
      return;
    }

    setInputMode(nextMode);
    setError(null);
  }

  function confirmInputModeSwitch() {
    if (!pendingInputMode) {
      return;
    }

    const nextMode = pendingInputMode;
    resetVoiceInput();
    setInputMode(nextMode);
  }

  function cancelInputModeSwitch() {
    setPendingInputMode(null);
  }

  async function handleStopRecording() {
    setRecorderError(null);
    const recordedFile = await stopRecording();

    if (!recordedFile) {
      setError("Запись пуста — попробуйте ещё раз");
      return;
    }

    selectRecordedFile(recordedFile);
  }

  const replaceWarningMessage =
    pendingInputMode === "upload"
      ? "Запись будет удалена. Переключиться на загрузку файла?"
      : pendingInputMode === "record"
        ? "Загруженный файл будет удалён. Переключиться на запись с микрофона?"
        : null;
  const previewSourceLabel = fileSource === "record" ? "Запись с микрофона" : "Загруженный файл";

  const previewDurationLabel =
    previewDurationSec !== null ? formatRecordingTime(Math.round(previewDurationSec)) : null;
  const isPreviewTooShort =
    previewDurationSec !== null && previewDurationSec < MIN_VOICE_SAMPLE_DURATION_SEC;
  const isPreviewTooLong =
    previewDurationSec !== null && previewDurationSec > MAX_VOICE_SAMPLE_DURATION_SEC;
  const consentRequired = !confirmed;
  const voiceInputDisabled =
    disabled || isSubmitting || consentRequired || Boolean(pendingInputMode);
  const consentNoticeClassName = styles.consentNotice;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Запишите голос или выберите аудиофайл");
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
        throw new Error(`Минимальная длительность — ${MIN_VOICE_SAMPLE_DURATION_SEC} сек`);
      }

      if (durationSec > MAX_VOICE_SAMPLE_DURATION_SEC) {
        throw new Error(`Максимальная длительность — ${MAX_VOICE_SAMPLE_DURATION_SEC} сек`);
      }

      const formData = new FormData();
      formData.append("soundFile", file);
      formData.append("confirmed", "true");
      formData.append("consentPhrase", VOICE_CONSENT_PHRASE);
      formData.append("durationSec", String(durationSec));

      const sample = await api.voiceSamples.create(formData);

      if (onSuccess) {
        onSuccess(sample.id);
      } else {
        router.push(`/consent?id=${sample.id}`);
      }
    } catch (submitError) {
      setError(resolveErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!authReady) {
    if (isLanding) {
      return (
        <div className={lp.voiceWrap}>
          <div className={lp.voiceCard}>
            <LoadingPanel lines={3} />
          </div>
        </div>
      );
    }

    return <LoadingPanel />;
  }

  const formClassName = styles.form;
  const fieldClassName = styles.field;
  const labelClassName = styles.label;
  const inputClassName = editorStyles.ownVoiceFileInput;
  const submitClassName = styles.submit;
  const hintClassName = styles.hint;
  const errorClassName = styles.error;

  const content = (
    <>
      {isPage ? (
        <>
          <h1 className={appShell.formPageTitle}>Запись голоса</h1>
          <p className={appShell.formPageDescription}>
            Выберите один способ: запись с микрофона или загрузка файла ({durationHint}). Затем
            привяжите модель из Kits.
          </p>
        </>
      ) : (
        <p className={hintClassName}>
          Выберите один способ: запись с микрофона или загрузка файла ({durationHint}).
          {isLanding ? " Затем создайте трек с вашим вокалом." : null}
        </p>
      )}

      <form className={formClassName} onSubmit={handleSubmit}>
        <div className={fieldClassName}>
          <span className={labelClassName}>Согласие на обработку персональных данных.</span>
          <label className={styles.consentRow}>
            <input
              checked={confirmed}
              className={appShell.accentCheckbox}
              disabled={disabled || isSubmitting || isRecording}
              type="checkbox"
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span className={styles.consentText}>
              {VOICE_CONSENT_PHRASE}
            </span>
          </label>
          {consentRequired ? (
            <p className={consentNoticeClassName}>
              Без подтверждения согласия запись голоса и загрузка файла недоступны.
            </p>
          ) : null}
        </div>

        <div
          className={editorStyles.ownVoiceModeSwitch}
          role="group"
          aria-label="Способ ввода голоса"
        >
          <VoiceModeButton
            active={inputMode === "record"}
            disabled={disabled || isSubmitting || isRecording || consentRequired}
            onSelect={() => requestInputMode("record")}
          >
            Микрофон
          </VoiceModeButton>
          <VoiceModeButton
            active={inputMode === "upload"}
            disabled={disabled || isSubmitting || isRecording || consentRequired}
            onSelect={() => requestInputMode("upload")}
          >
            Файл
          </VoiceModeButton>
        </div>

        {replaceWarningMessage ? (
          <div className={editorStyles.ownVoiceReplaceWarning}>
            <p className={editorStyles.ownVoiceReplaceWarningText}>{replaceWarningMessage}</p>
            <div className={editorStyles.ownVoiceReplaceWarningActions}>
              <button
                className={editorStyles.toolButton}
                type="button"
                onClick={cancelInputModeSwitch}
              >
                Отмена
              </button>
              <button
                className={editorStyles.primaryButton}
                type="button"
                onClick={confirmInputModeSwitch}
              >
                Переключить
              </button>
            </div>
          </div>
        ) : null}

        {inputMode === "record" ? (
          <div className={fieldClassName}>
            <span className={labelClassName}>Запись с микрофона</span>
            <div className={editorStyles.ownVoiceRecordRow}>
              {!isRecording ? (
                <button
                  className={editorStyles.ownVoiceRecordButton}
                  disabled={voiceInputDisabled}
                  type="button"
                  onClick={() => {
                    if (!confirmed) {
                      setError("Подтвердите согласие перед записью голоса");
                      return;
                    }

                    void startRecording();
                  }}
                >
                  <Mic aria-hidden className={editorStyles.ownVoiceRecordButtonIcon} />
                  Запись
                </button>
              ) : (
                <>
                  <button
                    className={editorStyles.toolButtonDestructive}
                    disabled={disabled || isSubmitting}
                    type="button"
                    onClick={() => void handleStopRecording()}
                  >
                    Стоп
                  </button>
                  <button
                    className={editorStyles.toolButton}
                    disabled={disabled || isSubmitting}
                    type="button"
                    onClick={cancelRecording}
                  >
                    Отмена
                  </button>
                  <span className={editorStyles.ownVoiceRecordingLabel}>
                    Идёт запись {formatRecordingTime(elapsedSec)}
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <label className={fieldClassName}>
            <span className={labelClassName}>Загрузка файла</span>
            <input
              key={fileInputKey}
              className={inputClassName}
              disabled={voiceInputDisabled}
              type="file"
              accept="audio/*"
              onChange={(event) => {
                selectUploadedFile(event.target.files?.[0] ?? null);
              }}
            />
          </label>
        )}

        {file && previewUrl ? (
          <div className={editorStyles.ownVoicePreview}>
            <div className={editorStyles.ownVoicePreviewHeader}>
              <span className={labelClassName}>Предпросмотр · {previewSourceLabel}</span>
              <button
                className={editorStyles.toolButton}
                disabled={disabled || isSubmitting || isRecording}
                type="button"
                onClick={resetVoiceInput}
              >
                Удалить
              </button>
            </div>
            <p className={hintClassName}>
              {file.name}
              {file.size > 0 ? ` · ${Math.round(file.size / 1024)} KB` : null}
              {previewDurationLabel ? ` · ${previewDurationLabel}` : null}
            </p>
            <audio
              className={editorStyles.ownVoicePreviewPlayer}
              controls
              preload="metadata"
              src={previewUrl}
              onLoadedMetadata={(event) => {
                const duration = event.currentTarget.duration;

                if (Number.isFinite(duration) && duration > 0) {
                  setPreviewDurationSec(duration);
                }
              }}
            />
            {isPreviewTooShort ? (
              <p className={errorClassName}>
                Минимум {MIN_VOICE_SAMPLE_DURATION_SEC} сек — запишите или загрузите длиннее.
              </p>
            ) : null}
            {isPreviewTooLong ? (
              <p className={errorClassName}>
                Максимум {MAX_VOICE_SAMPLE_DURATION_SEC} сек — запишите или загрузите короче.
              </p>
            ) : null}
            <p className={hintClassName}>
              Файл пока только в браузере. После «Загрузить образец» он сохранится на сервере.
            </p>
          </div>
        ) : null}

        <button
          className={submitClassName}
          disabled={disabled || isSubmitting || isRecording || consentRequired || !file}
          type="submit"
        >
          {isSubmitting ? "Загрузка..." : "Загрузить образец"}
        </button>
      </form>

      {recorderError ? <p className={errorClassName}>{recorderError}</p> : null}
      {error ? <p className={errorClassName}>{error}</p> : null}
    </>
  );

  if (isLanding) {
    return (
      <div className={lp.voiceWrap}>
        <div className={lp.voiceCard}>{content}</div>
      </div>
    );
  }

  return <section className={appShell.formPage}>{content}</section>;
}
