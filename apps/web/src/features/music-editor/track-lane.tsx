"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import type { AudioTrackDto, EditorTrackId } from "@ai-music/shared";
import { useRef, useEffect } from "react";
import { Tooltip } from "@/shared/ui/tooltip";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { seekTimeline } from "@/features/music-editor/utils/timeline-sync";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface TrackLaneProps {
  track: AudioTrackDto;
  disabled?: boolean;
  mixControlsDisabled?: boolean;
  regionSelected: boolean;
  onVolumeCommit: (trackId: EditorTrackId, gainDb: number) => void;
  onMuteToggle: (trackId: EditorTrackId, muted: boolean) => void;
  onSoloToggle: (trackId: EditorTrackId, solo: boolean) => void;
}

const TRACK_TOOLTIPS: Record<AudioTrackDto["id"], string> = {
  vocal: "Дорожка вокала. Громкость, mute и solo применяются к выбранному региону",
  instrumental: "Музыкальная дорожка. Громкость, mute и solo применяются к выбранному региону",
};

function stopRowSelection(event: MouseEvent | PointerEvent) {
  event.stopPropagation();
}

function TrackProgressBar({ disabled, onSelect }: { disabled: boolean; onSelect: () => void }) {
  const currentTimeMs = useAudioEditorStore((state) => state.currentTimeMs);
  const durationMs = useAudioEditorStore((state) => state.durationMs);
  const progress = durationMs > 0 ? Math.min(1, Math.max(0, currentTimeMs / durationMs)) : 0;

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

export function TrackLane({
  track,
  disabled = false,
  mixControlsDisabled = false,
  regionSelected,
  onVolumeCommit,
  onMuteToggle,
  onSoloToggle,
}: TrackLaneProps) {
  const linkedTracks = useAudioEditorStore((state) => state.linkedTracks);
  const selectedTrackId = useAudioEditorStore((state) => state.selectedTrackId);
  const selectTrackFromPanel = useAudioEditorStore((state) => state.selectTrackFromPanel);
  const selected = linkedTracks || selectedTrackId === track.id;
  const preview = useAudioEditorStore((state) => state.previewTracks[track.id]);
  const setPreviewGain = useAudioEditorStore((state) => state.setPreviewGain);
  const pendingGainDbRef = useRef(preview.gainDb);
  const controlsDisabled = mixControlsDisabled || !regionSelected;

  useEffect(() => {
    pendingGainDbRef.current = preview.gainDb;
  }, [preview.gainDb]);

  function handleSelect() {
    if (disabled) {
      return;
    }

    selectTrackFromPanel(track.id);
  }

  function selectTrackForControls() {
    if (!disabled) {
      selectTrackFromPanel(track.id);
    }
  }

  function commitVolume() {
    selectTrackForControls();
    onVolumeCommit(track.id, pendingGainDbRef.current);
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
          <Tooltip content="Отключить эту дорожку в выбранном регионе">
            <button
              className={preview.muted ? styles.laneToggleActive : styles.laneToggle}
              disabled={controlsDisabled}
              type="button"
              onClick={() => {
                selectTrackForControls();
                onMuteToggle(track.id, !preview.muted);
              }}
            >
              M
            </button>
          </Tooltip>

          <Tooltip content="Слушать только эту дорожку в выбранном регионе">
            <button
              className={preview.solo ? styles.laneToggleActive : styles.laneToggle}
              disabled={controlsDisabled}
              type="button"
              onClick={() => {
                selectTrackForControls();
                onSoloToggle(track.id, !preview.solo);
              }}
            >
              S
            </button>
          </Tooltip>

          <Tooltip content="Громкость выбранного региона на этой дорожке">
            <label className={styles.trackVolumeLabel}>
              <input
                className={styles.trackVolumeSlider}
                disabled={controlsDisabled}
                max={12}
                min={-12}
                step={1}
                type="range"
                value={preview.gainDb}
                onChange={(event) => {
                  const gainDb = Number(event.target.value);
                  pendingGainDbRef.current = gainDb;
                  setPreviewGain(track.id, gainDb);
                }}
                onKeyUp={commitVolume}
                onPointerUp={commitVolume}
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
