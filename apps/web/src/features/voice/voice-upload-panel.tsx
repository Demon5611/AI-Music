"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import {
  MAX_VOICE_SAMPLE_DURATION_SEC,
  MIN_VOICE_SAMPLE_DURATION_SEC,
  VOICE_CONSENT_PHRASE,
  type VocalGender,
} from "@ai-music/shared";
import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readAudioDurationSec } from "@/features/voice/read-audio-duration";
import {
  VoiceRecordingScriptPanel,
  VoiceRecordingScriptToggle,
} from "@/features/voice/voice-recording-script-control";
import { VoiceGenderSelect } from "@/features/voice/voice-gender-select";
import { useVoiceRecordingScript } from "@/features/voice/hooks/use-voice-recording-script";
import { VoiceRecordingTipsPanel } from "@/features/voice/voice-recording-tips-panel";
import { voiceUi } from "@/features/voice/voice-classes";
import { useVoiceRecorder } from "@/features/voice/use-voice-recorder";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { lp } from "@/features/landing/landing-classes";
import { LoadingPanel } from "@/shared/ui/elevenlabs";
import { appShell } from "@/shared/theme/app-theme";

type VoiceUploadVariant = "page" | "landing";

const upload = voiceUi.upload;

function resolveVoiceUploadStyles(variant: VoiceUploadVariant) {
  const isLanding = variant === "landing";

  return {
    isLanding,
    isPage: variant === "page",
    form: isLanding ? upload.form : appShell.formPageForm,
    field: isLanding ? upload.field : appShell.formField,
    label: isLanding ? upload.fieldLabel : appShell.formLabel,
    submit: isLanding ? upload.submit : appShell.formSubmit,
    hint: isLanding ? upload.hint : appShell.formPageDescription,
    error: isLanding ? upload.error : appShell.formError,
    consentRow: isLanding ? upload.consentRow : appShell.formConsentRow,
    consentNotice: isLanding ? upload.consentNotice : appShell.formConsentNotice,
  };
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
  const className = active ? upload.modeButtonActive : upload.modeButton;

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
  const [recordedDurationHintSec, setRecordedDurationHintSec] = useState<number | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [confirmed, setConfirmed] = useState(false);
  const [vocalGender, setVocalGender] = useState<VocalGender | null>(null);
  const [isSavingGender, setIsSavingGender] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScriptPanelOpen, setIsScriptPanelOpen] = useState(false);
  const {
    cancelRecording,
    elapsedSec,
    error: recorderError,
    isRecording,
    setError: setRecorderError,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();
  const {
    error: scriptError,
    generateScript,
    isGenerating: isScriptGenerating,
    script: recordingScript,
  } = useVoiceRecordingScript(vocalGender);

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

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let cancelled = false;

    void api.users
      .getMe()
      .then((user) => {
        if (!cancelled) {
          setVocalGender(user.vocalGender);
        }
      })
      .catch(() => {
        // Profile gender is optional for the form — ignore load errors.
      });

    return () => {
      cancelled = true;
    };
  }, [api.users, authReady]);

  useEffect(() => {
    if (!isScriptPanelOpen || !vocalGender || recordingScript || isScriptGenerating) {
      return;
    }

    void generateScript();
  }, [
    generateScript,
    isScriptGenerating,
    isScriptPanelOpen,
    recordingScript,
    vocalGender,
  ]);

  useEffect(() => {
    if (!file) {
      return;
    }

    let cancelled = false;

    void readAudioDurationSec(file)
      .then((durationSec) => {
        if (!cancelled) {
          setPreviewDurationSec(durationSec);
        }
      })
      .catch(() => {
        if (!cancelled && recordedDurationHintSec !== null) {
          setPreviewDurationSec(recordedDurationHintSec);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file, recordedDurationHintSec]);

  function clearSelectedFile() {
    setFile(null);
    setFileSource(null);
    setPreviewDurationSec(null);
    setRecordedDurationHintSec(null);
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

    if (nextFile && !vocalGender) {
      setError("Выберите пол");
      return;
    }

    if (!nextFile) {
      clearSelectedFile();
      return;
    }

    setFile(nextFile);
    setFileSource("upload");
    setRecordedDurationHintSec(null);
    setPreviewDurationSec(null);
    setError(null);
  }

  function selectRecordedFile(nextFile: File, durationHintSec: number) {
    setFile(nextFile);
    setFileSource("record");
    setRecordedDurationHintSec(durationHintSec);
    setPreviewDurationSec(durationHintSec);
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

  async function handleGenderChange(nextGender: VocalGender) {
    setError(null);
    setVocalGender(nextGender);
    setIsSavingGender(true);

    try {
      const user = await api.users.updateMe({ vocalGender: nextGender });
      setVocalGender(user.vocalGender);
    } catch (saveError) {
      setError(parseApiError(saveError, "Не удалось сохранить пол"));
    } finally {
      setIsSavingGender(false);
    }
  }

  async function handleStopRecording() {
    setRecorderError(null);
    const recording = await stopRecording();

    if (!recording) {
      setError("Запись пуста — попробуйте ещё раз");
      return;
    }

    selectRecordedFile(recording.file, recording.durationSec);
  }

  async function resolveUploadDurationSec(uploadFile: File): Promise<number> {
    try {
      return await readAudioDurationSec(uploadFile);
    } catch (readError) {
      if (fileSource === "record" && recordedDurationHintSec !== null) {
        return recordedDurationHintSec;
      }

      throw readError;
    }
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
  const genderRequired = !vocalGender;
  const recordInputDisabled =
    disabled ||
    isSubmitting ||
    consentRequired ||
    genderRequired ||
    Boolean(pendingInputMode);
  const uploadInputDisabled =
    disabled ||
    isSubmitting ||
    consentRequired ||
    genderRequired ||
    Boolean(pendingInputMode);
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

    if (!vocalGender) {
      setError("Выберите пол");
      return;
    }

    setIsSubmitting(true);

    try {
      const durationSec = await resolveUploadDurationSec(file);

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
      setError(parseApiError(submitError, "Не удалось загрузить образец голоса"));
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
  const inputClassName = upload.fileInput;
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
            пройдите верификацию голоса Suno.
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
          <label className={styles.consentRow}>
            <input
              checked={confirmed}
              className={voiceUi.consentCheckbox}
              disabled={disabled || isSubmitting || isRecording}
              type="checkbox"
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span className={voiceUi.consentContent}>
              <span className={voiceUi.consentTitle}>
                Согласие на обработку персональных данных.
              </span>
              <span className={voiceUi.consentPhrase}>{VOICE_CONSENT_PHRASE}</span>
            </span>
          </label>
          {consentRequired ? (
            <p className={consentNoticeClassName}>
              Без подтверждения согласия запись голоса и загрузка файла недоступны.
            </p>
          ) : genderRequired ? (
            <p className={consentNoticeClassName}>
              {inputMode === "record"
                ? "Выберите пол перед записью голоса."
                : "Выберите пол перед загрузкой файла."}
            </p>
          ) : null}
        </div>

        <div
          className={upload.modeSwitch}
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

        <VoiceRecordingTipsPanel />

        {replaceWarningMessage ? (
          <div className={upload.replaceWarning}>
            <p className={upload.replaceWarningText}>{replaceWarningMessage}</p>
            <div className={upload.replaceWarningActions}>
              <button
                className={upload.toolButton}
                type="button"
                onClick={cancelInputModeSwitch}
              >
                Отмена
              </button>
              <button
                className={upload.primaryButton}
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
            <div className={voiceUi.recordScriptWrap}>
              <div className={upload.recordRow}>
                {!isRecording ? (
                  <button
                    className={upload.recordButton}
                    disabled={recordInputDisabled}
                    type="button"
                    onClick={() => {
                      if (!confirmed) {
                        setError("Подтвердите согласие перед записью голоса");
                        return;
                      }

                      if (!vocalGender) {
                        setError("Выберите пол");
                        return;
                      }

                      void startRecording();
                    }}
                  >
                    <Mic aria-hidden className={upload.recordButtonIcon} />
                    Запись
                  </button>
                ) : (
                  <>
                    <button
                      className={upload.toolButtonDestructive}
                      disabled={disabled || isSubmitting}
                      type="button"
                      onClick={() => void handleStopRecording()}
                    >
                      Стоп
                    </button>
                    <button
                      className={upload.toolButton}
                      disabled={disabled || isSubmitting}
                      type="button"
                      onClick={cancelRecording}
                    >
                      Отмена
                    </button>
                    <span className={upload.recordingLabel}>
                      Идёт запись {formatRecordingTime(elapsedSec)}
                    </span>
                  </>
                )}
                <VoiceRecordingScriptToggle
                  disabled={disabled || isSubmitting || isSavingGender || consentRequired}
                  open={isScriptPanelOpen}
                  onToggle={() => setIsScriptPanelOpen((value) => !value)}
                />
                <VoiceGenderSelect
                  disabled={disabled || isSubmitting || isRecording || isSavingGender || consentRequired}
                  value={vocalGender}
                  onChange={(value) => void handleGenderChange(value)}
                />
              </div>
              <VoiceRecordingScriptPanel
                error={scriptError}
                isGenerating={isScriptGenerating}
                open={isScriptPanelOpen}
                script={recordingScript}
              />
            </div>
          </div>
        ) : (
          <div className={fieldClassName}>
            <span className={labelClassName}>Загрузка файла</span>
            <div className={upload.recordRow}>
              <input
                key={fileInputKey}
                aria-label="Выберите аудиофайл голоса"
                className={inputClassName}
                disabled={uploadInputDisabled}
                type="file"
                accept="audio/*"
                onChange={(event) => {
                  selectUploadedFile(event.target.files?.[0] ?? null);
                }}
              />
              <VoiceGenderSelect
                disabled={disabled || isSubmitting || isSavingGender || consentRequired}
                value={vocalGender}
                onChange={(value) => void handleGenderChange(value)}
              />
            </div>
          </div>
        )}

        {file && previewUrl ? (
          <div className={upload.preview}>
            <div className={upload.previewHeader}>
              <span className={labelClassName}>Предпросмотр · {previewSourceLabel}</span>
              <button
                className={upload.toolButton}
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
              className={upload.previewPlayer}
              controls
              preload="metadata"
              src={previewUrl}
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
          disabled={
            disabled || isSubmitting || isRecording || consentRequired || genderRequired || !file
          }
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
