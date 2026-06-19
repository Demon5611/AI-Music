"use client";

import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { VOICE_RECORDING_SCRIPT_HINT } from "@/features/voice/voice-recording-tips";
import { voiceUi } from "@/features/voice/voice-classes";
import { AiProcessingStatus } from "@/shared/ui/elevenlabs/ai-processing-status";

interface VoiceRecordingScriptToggleProps {
  disabled?: boolean;
  open: boolean;
  onToggle: () => void;
}

export function VoiceRecordingScriptToggle({
  disabled = false,
  open,
  onToggle,
}: VoiceRecordingScriptToggleProps) {
  const className = cn(
    voiceUi.scriptPopoverTrigger,
    open && voiceUi.scriptPopoverTriggerActive,
  );
  const label = (
    <>
      <BookOpen aria-hidden className={voiceUi.scriptPopoverIcon} />
      Текст для записи
    </>
  );

  if (open) {
    return (
      <button
        aria-controls="voice-recording-script-panel"
        aria-expanded="true"
        className={className}
        disabled={disabled}
        type="button"
        onClick={onToggle}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      aria-controls="voice-recording-script-panel"
      aria-expanded="false"
      className={className}
      disabled={disabled}
      type="button"
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

interface VoiceRecordingScriptPanelProps {
  error: string | null;
  isGenerating: boolean;
  open: boolean;
  script: string | null;
}

export function VoiceRecordingScriptPanel({
  error,
  isGenerating,
  open,
  script,
}: VoiceRecordingScriptPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-label="Текст для напева"
      className={voiceUi.scriptPopoverPanel}
      id="voice-recording-script-panel"
      role="region"
    >
      <p className={voiceUi.scriptPopoverHint}>{VOICE_RECORDING_SCRIPT_HINT}</p>
      {isGenerating ? (
        <AiProcessingStatus agentState="thinking" label="AI готовит текст для записи..." />
      ) : null}
      {script ? <p className={voiceUi.scriptPopoverText}>{script}</p> : null}
      {!isGenerating && !script && !error ? (
        <p className={voiceUi.scriptPopoverHint}>
          Выберите пол и откройте панель снова — текст сгенерируется автоматически.
        </p>
      ) : null}
      {error ? <p className={voiceUi.upload.error}>{error}</p> : null}
    </div>
  );
}
