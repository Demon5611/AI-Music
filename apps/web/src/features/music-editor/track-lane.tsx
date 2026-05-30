"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import type { AudioTrackDto } from "@ai-music/shared";
import { Tooltip } from "@/shared/ui/tooltip";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { seekTimeline } from "@/features/music-editor/utils/timeline-sync";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface TrackLaneProps {
  track: AudioTrackDto;
  disabled?: boolean;
}

const TRACK_TOOLTIPS: Record<AudioTrackDto["id"], string> = {
  vocal: "Дорожка вокала. Можно сделать тише, отключить или заменить голос",
  instrumental: "Музыкальная дорожка. Можно менять громкость или отключать",
};

function stopRowSelection(event: MouseEvent | PointerEvent) {
  event.stopPropagation();
}

function TrackProgressBar({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: () => void;
}) {
  const currentTimeMs = useAudioEditorStore((state) => state.currentTimeMs);
  const durationMs = useAudioEditorStore((state) => state.durationMs);
  const progress =
    durationMs > 0 ? Math.min(1, Math.max(0, currentTimeMs / durationMs)) : 0;

  return (
    <button
      className={styles.trackProgressBar}
      disabled={disabled}
      style={{ "--track-progress": `${progress * 100}%` } as CSSProperties}
      type="button"
      onClick={() => {
        onSelect();
        seekTimeline(currentTimeMs);
      }}
    >
      <span className={styles.trackProgressFill} />
    </button>
  );
}

export function TrackLane({ track, disabled = false }: TrackLaneProps) {
  const linkedTracks = useAudioEditorStore((state) => state.linkedTracks);
  const selectedTrackId = useAudioEditorStore((state) => state.selectedTrackId);
  const selectTrackFromPanel = useAudioEditorStore((state) => state.selectTrackFromPanel);
  const selected = linkedTracks || selectedTrackId === track.id;
  const preview = useAudioEditorStore((state) => state.previewTracks[track.id]);
  const togglePreviewMute = useAudioEditorStore((state) => state.togglePreviewMute);
  const togglePreviewSolo = useAudioEditorStore((state) => state.togglePreviewSolo);
  const setPreviewGain = useAudioEditorStore((state) => state.setPreviewGain);

  function handleSelect() {
    if (disabled) {
      return;
    }

    selectTrackFromPanel(track.id);
  }

  return (
    <Tooltip block content={TRACK_TOOLTIPS[track.id]}>
      <div
        className={selected ? styles.trackLaneRowSelected : styles.trackLaneRow}
        onClick={handleSelect}
        onKeyDown={(event) => {
          if (disabled || (event.key !== "Enter" && event.key !== " ")) {
            return;
          }

          event.preventDefault();
          handleSelect();
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <span className={styles.trackLaneLabel}>{track.label}</span>

        <div
          className={styles.trackLaneControls}
          onClick={stopRowSelection}
          onPointerDown={stopRowSelection}
        >
          <Tooltip content="Отключить эту дорожку в preview">
            <button
              className={preview.muted ? styles.laneToggleActive : styles.laneToggle}
              disabled={disabled}
              type="button"
              onClick={() => togglePreviewMute(track.id)}
            >
              M
            </button>
          </Tooltip>

          <Tooltip content="Слушать только эту дорожку">
            <button
              className={preview.solo ? styles.laneToggleActive : styles.laneToggle}
              disabled={disabled}
              type="button"
              onClick={() => togglePreviewSolo(track.id)}
            >
              S
            </button>
          </Tooltip>

          <Tooltip content="Изменить громкость">
            <label className={styles.trackVolumeLabel}>
              <input
                className={styles.trackVolumeSlider}
                disabled={disabled}
                max={12}
                min={-12}
                step={1}
                type="range"
                value={preview.gainDb}
                onChange={(event) =>
                  setPreviewGain(track.id, Number(event.target.value))
                }
              />
              <span>{preview.gainDb} dB</span>
            </label>
          </Tooltip>
        </div>

        <div
          className={styles.trackWaveformWrap}
          onClick={stopRowSelection}
          onPointerDown={stopRowSelection}
        >
          <TrackProgressBar disabled={disabled} onSelect={handleSelect} />
        </div>
      </div>
    </Tooltip>
  );
}
