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
import { useVoiceRecorder } from "@/features/voice/use-voice-recorder";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { LoadingPanel } from "@/shared/ui/elevenlabs";
import editorStyles from "@/features/music-editor/styles/music-editor.module.css";
import formStyles from "@/shared/ui/form.module.css";

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

interface VoiceUploadPanelProps {
  disabled?: boolean;
  onSuccess?: (sampleId: string) => void;
  variant?: "page" | "embedded";
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

  const isEmbedded = variant === "embedded";
  const styles = isEmbedded ? editorStyles : formStyles;
  const durationHint = `${MIN_VOICE_SAMPLE_DURATION_SEC}–${MAX_VOICE_SAMPLE_DURATION_SEC} сек`;

  async function handleStopRecording() {
    setRecorderError(null);
    const recordedFile = await stopRecording();

    if (!recordedFile) {
      setError("Запись пуста — попробуйте ещё раз");
      return;
    }

    setFile(recordedFile);
    setError(null);
  }

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
    return isEmbedded ? <LoadingPanel lines={2} /> : <LoadingPanel />;
  }

  const formClassName = isEmbedded ? editorStyles.ownVoiceForm : styles.form;
  const fieldClassName = isEmbedded ? editorStyles.ownVoiceField : styles.field;
  const labelClassName = isEmbedded ? editorStyles.fieldLabel : styles.label;
  const inputClassName = isEmbedded ? editorStyles.textInput : styles.fileInput;
  const submitClassName = isEmbedded ? editorStyles.primaryButton : styles.submit;
  const hintClassName = isEmbedded ? editorStyles.panelHint : styles.description;
  const errorClassName = isEmbedded ? editorStyles.error : styles.error;

  const content = (
    <>
      {!isEmbedded ? (
        <>
          <h1 className={styles.title}>Запись голоса</h1>
          <p className={styles.description}>
            Загрузите или запишите образец своего голоса ({durationHint}). Затем привяжите модель из
            Kits.
          </p>
        </>
      ) : (
        <p className={hintClassName}>
          Запишите или загрузите образец ({durationHint}), затем привяжите модель Kits.
        </p>
      )}

      <form className={formClassName} onSubmit={handleSubmit}>
        <div className={fieldClassName}>
          <div className={editorStyles.ownVoiceRecordRow}>
            {!isRecording ? (
              <button
                className={editorStyles.toolButton}
                disabled={disabled || isSubmitting}
                type="button"
                onClick={() => void startRecording()}
              >
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

        <label className={fieldClassName}>
          <span className={labelClassName}>Аудиофайл</span>
          <input
            className={inputClassName}
            disabled={disabled || isSubmitting || isRecording}
            type="file"
            accept="audio/*"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
          />
        </label>

        {file ? (
          <p className={hintClassName}>
            Выбран файл: {file.name}
            {file.size > 0 ? ` (${Math.round(file.size / 1024)} KB)` : null}
          </p>
        ) : null}

        <label className={fieldClassName}>
          <span className={labelClassName}>Согласие</span>
          <label className={isEmbedded ? editorStyles.panelHint : styles.hint}>
            <input
              checked={confirmed}
              disabled={disabled || isSubmitting || isRecording}
              type="checkbox"
              onChange={(event) => setConfirmed(event.target.checked)}
            />{" "}
            {VOICE_CONSENT_PHRASE}
          </label>
        </label>

        <button
          className={submitClassName}
          disabled={disabled || isSubmitting || isRecording}
          type="submit"
        >
          {isSubmitting ? "Загрузка..." : "Загрузить образец"}
        </button>
      </form>

      {recorderError ? <p className={errorClassName}>{recorderError}</p> : null}
      {error ? <p className={errorClassName}>{error}</p> : null}
    </>
  );

  if (isEmbedded) {
    return <div className={editorStyles.ownVoicePanel}>{content}</div>;
  }

  return <section className={styles.section}>{content}</section>;
}
