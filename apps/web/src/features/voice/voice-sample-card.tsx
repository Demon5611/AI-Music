"use client";

import type { VoiceSample } from "@ai-music/shared";
import { isVoiceSampleReadyForGeneration } from "@/entities/voice-sample";
import {
  buildVoiceSampleAudioUrl,
  formatVoiceSampleDuration,
  resolveVoiceSampleStatusLabel,
  resolveVoiceSampleTitle,
} from "@/entities/voice-sample/voice-sample-display";
import { voiceUi } from "@/features/voice/voice-classes";
import { AudioPreviewPlayer } from "@/shared/ui/elevenlabs";
import { cn } from "@/lib/utils";

interface VoiceSampleCardProps {
  sample: VoiceSample;
}

function resolveStatusBadgeClass(sample: VoiceSample): string {
  if (isVoiceSampleReadyForGeneration(sample)) {
    return voiceUi.sampleCardBadgeReady;
  }

  if (sample.voiceCloneStatus === "failed") {
    return voiceUi.sampleCardBadgeError;
  }

  if (
    sample.voiceCloneStatus === "awaiting_verification" ||
    sample.voiceCloneStatus === "preparing" ||
    sample.voiceCloneStatus === "cloning"
  ) {
    return voiceUi.sampleCardBadgeWarning;
  }

  return voiceUi.sampleCardBadgePending;
}

export function VoiceSampleCard({ sample }: VoiceSampleCardProps) {
  const isReady = isVoiceSampleReadyForGeneration(sample);

  return (
    <article className={voiceUi.sampleCard}>
      <div className={voiceUi.sampleCardHeader}>
        <div className={voiceUi.sampleCardBody}>
          <h3 className={voiceUi.sampleCardTitle}>{resolveVoiceSampleTitle(sample)}</h3>
          <div className={voiceUi.sampleCardMeta}>
            <span className={resolveStatusBadgeClass(sample)}>
              {resolveVoiceSampleStatusLabel(sample)}
            </span>
            <span>{formatVoiceSampleDuration(sample.durationSec)}</span>
          </div>
        </div>
      </div>
      <div className={voiceUi.sampleCardPlayerRow}>
        {sample.voiceCloneStatus === "failed" ? (
          <p className={voiceUi.sampleCardMeta}>
            {sample.voiceCloneError ?? "Аудио недоступно для предпрослушивания"}
          </p>
        ) : (
          <AudioPreviewPlayer
            className={cn(voiceUi.sampleCardPlayer, isReady && voiceUi.sampleCardPlayerReady)}
            src={buildVoiceSampleAudioUrl(sample.id)}
          />
        )}
      </div>
    </article>
  );
}
