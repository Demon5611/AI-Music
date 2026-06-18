"use client";

import type { VoiceSample } from "@ai-music/shared";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  isVoiceSampleReadyForGeneration,
} from "@/entities/voice-sample";
import {
  buildVoiceSampleAudioUrl,
  formatVoiceSampleDuration,
  resolveVoiceSampleStatusLabel,
  resolveVoiceSampleTitle,
} from "@/entities/voice-sample/voice-sample-display";
import { mc } from "@/features/music-create/music-create-classes";
import { AudioPreviewPlayer } from "@/shared/ui/elevenlabs";
import { cn } from "@/lib/utils";

interface VoiceSamplePickerProps {
  samples: VoiceSample[];
  selectedId: string | null;
  isLoading: boolean;
  loadError: string | null;
  deleteError: string | null;
  deletingSampleId: string | null;
  onSelect: (sampleId: string) => void;
  onDelete: (sampleId: string) => void;
}

function resolveStatusBadgeClass(sample: VoiceSample): string {
  if (isVoiceSampleReadyForGeneration(sample)) {
    return mc.voicePickerBadgeReady;
  }

  if (sample.voiceCloneStatus === "failed") {
    return mc.voicePickerBadgeError;
  }

  if (
    sample.voiceCloneStatus === "awaiting_verification" ||
    sample.voiceCloneStatus === "preparing" ||
    sample.voiceCloneStatus === "cloning"
  ) {
    return mc.voicePickerBadgeWarning;
  }

  return mc.voicePickerBadgePending;
}

function VoiceSamplePickerToggle({
  open,
  readyCount,
  totalCount,
  selectedTitle,
  onToggle,
}: {
  open: boolean;
  readyCount: number;
  totalCount: number;
  selectedTitle: string | null;
  onToggle: () => void;
}) {
  const toggleClassName = cn(mc.voicePickerToggle, open && mc.voicePickerToggleActive);
  const meta = selectedTitle
    ? `${selectedTitle} · ${readyCount} из ${totalCount} готовы`
    : `${readyCount} из ${totalCount} готовы к генерации`;

  if (open) {
    return (
      <button
        aria-controls="voice-sample-picker-panel"
        aria-expanded="true"
        className={toggleClassName}
        type="button"
        onClick={onToggle}
      >
        <span className={mc.voicePickerToggleMain}>
          <FolderOpen aria-hidden className={mc.voicePickerToggleIcon} />
          <span className={mc.voicePickerToggleText}>
            <span className={mc.voicePickerToggleTitle}>Доступные образцы голоса</span>
            <span className={mc.voicePickerToggleMeta}>{meta}</span>
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      aria-controls="voice-sample-picker-panel"
      aria-expanded="false"
      className={toggleClassName}
      type="button"
      onClick={onToggle}
    >
      <span className={mc.voicePickerToggleMain}>
        <FolderOpen aria-hidden className={mc.voicePickerToggleIcon} />
        <span className={mc.voicePickerToggleText}>
          <span className={mc.voicePickerToggleTitle}>Доступные образцы голоса</span>
          <span className={mc.voicePickerToggleMeta}>{meta}</span>
        </span>
      </span>
    </button>
  );
}

function VoiceSamplePickerItem({
  sample,
  selected,
  isDeleting,
  onSelect,
  onDelete,
}: {
  sample: VoiceSample;
  selected: boolean;
  isDeleting: boolean;
  onSelect: (sampleId: string) => void;
  onDelete: (sampleId: string) => void;
}) {
  const isReady = isVoiceSampleReadyForGeneration(sample);
  const itemClassName = cn(
    mc.voicePickerItem,
    selected && mc.voicePickerItemSelected,
    !isReady && mc.voicePickerItemDisabled,
  );

  return (
    <article className={itemClassName}>
      <div className={mc.voicePickerItemHeader}>
        {isReady ? (
          <input
            aria-label={`Выбрать ${resolveVoiceSampleTitle(sample)}`}
            checked={selected}
            className={mc.voicePickerItemRadio}
            name="voiceSample"
            type="radio"
            onChange={() => onSelect(sample.id)}
          />
        ) : (
          <span aria-hidden className={mc.voicePickerItemRadio} />
        )}
        <div className={mc.voicePickerItemBody}>
          <h3 className={mc.voicePickerItemTitle}>{resolveVoiceSampleTitle(sample)}</h3>
          <div className={mc.voicePickerItemMeta}>
            <span className={resolveStatusBadgeClass(sample)}>
              {resolveVoiceSampleStatusLabel(sample)}
            </span>
            <span>{formatVoiceSampleDuration(sample.durationSec)}</span>
            {!isReady && sample.voiceCloneStatus === "awaiting_verification" ? (
              <Link className={mc.voicePickerLink} href={`/consent?id=${sample.id}`}>
                Пройти верификацию
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <div className={mc.voicePickerPlayerRow}>
        {sample.voiceCloneStatus === "failed" ? (
          <p className={mc.voicePickerItemMeta}>
            {sample.voiceCloneError ?? "Аудио недоступно для предпрослушивания"}
          </p>
        ) : (
          <AudioPreviewPlayer
            className={mc.voicePickerPlayer}
            src={buildVoiceSampleAudioUrl(sample.id)}
          />
        )}
        <button
          className={mc.voicePickerDeleteButton}
          disabled={isDeleting}
          type="button"
          onClick={() => onDelete(sample.id)}
        >
          {isDeleting ? "Удаление..." : "Удалить"}
        </button>
      </div>
    </article>
  );
}

export function VoiceSamplePicker({
  samples,
  selectedId,
  isLoading,
  loadError,
  deleteError,
  deletingSampleId,
  onSelect,
  onDelete,
}: VoiceSamplePickerProps) {
  const [open, setOpen] = useState(false);
  const readySamples = samples.filter(isVoiceSampleReadyForGeneration);
  const selectedSample = samples.find((sample) => sample.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <div className={mc.voicePickerEmpty}>Загрузка образцов голоса...</div>
    );
  }

  if (loadError) {
    return (
      <div className={mc.voicePickerEmpty} role="alert">
        {loadError}
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className={mc.voicePickerEmpty}>
        Образцов пока нет.{" "}
        <Link className={mc.voicePickerLink} href="/">
          Запишите голос на главной
        </Link>
        .
      </div>
    );
  }

  return (
    <section className={mc.voicePickerSection}>
      <VoiceSamplePickerToggle
        open={open}
        readyCount={readySamples.length}
        selectedTitle={selectedSample ? resolveVoiceSampleTitle(selectedSample) : null}
        totalCount={samples.length}
        onToggle={() => setOpen((value) => !value)}
      />

      {open ? (
        <div className={mc.voicePickerPanel} id="voice-sample-picker-panel">
          {deleteError ? (
            <p className={mc.errorInline} role="alert">
              {deleteError}
            </p>
          ) : null}
          {samples.map((sample) => (
            <VoiceSamplePickerItem
              key={sample.id}
              isDeleting={deletingSampleId === sample.id}
              sample={sample}
              selected={sample.id === selectedId}
              onDelete={onDelete}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
