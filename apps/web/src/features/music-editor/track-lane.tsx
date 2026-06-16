"use client";

import type { MouseEvent, PointerEvent } from "react";
import type { AudioTrackDto, EditorTrackId } from "@ai-music/shared";
import { useRef, useEffect, useLayoutEffect } from "react";
import { Tooltip } from "@/shared/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { seekTimeline } from "@/features/music-editor/utils/timeline-sync";
import { me } from "@/features/music-editor/music-editor-classes";
import trackLaneStyles from "@/features/music-editor/styles/track-lane.module.css";

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
  const fillRef = useRef<HTMLSpanElement>(null);
  const currentTimeMs = useAudioEditorStore((state) => state.currentTimeMs);
  const durationMs = useAudioEditorStore((state) => state.durationMs);
  const progress = durationMs > 0 ? Math.min(1, Math.max(0, currentTimeMs / durationMs)) : 0;

  useLayoutEffect(() => {
    fillRef.current?.style.setProperty("--track-progress", `${progress * 100}%`);
  }, [progress]);

  return (
    <button
      aria-label="Перемотать дорожку к текущей позиции воспроизведения"
      className={me.trackProgressBar}
      disabled={disabled}
      type="button"
      onClick={() => {
        onSelect();
        seekTimeline(currentTimeMs);
      }}
    >
      <span
        ref={fillRef}
        className={cn(me.trackProgressFill, trackLaneStyles.trackProgressFill)}
      />
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
    <div
      className={selected ? me.trackLaneRowSelected : me.trackLaneRow}
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
      <Tooltip align="start" content={TRACK_TOOLTIPS[track.id]} side="right">
        <span className={me.trackLaneLabel}>{track.label}</span>
      </Tooltip>

      <div
        className={me.trackLaneControls}
        onClick={stopRowSelection}
        onPointerDown={stopRowSelection}
      >
        <Tooltip align="start" content="Отключить эту дорожку в выбранном регионе" side="bottom">
          <button
            className={preview.muted ? me.laneToggleActive : me.laneToggle}
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

        <Tooltip content="Слушать только эту дорожку в выбранном регионе" side="bottom">
          <button
            className={preview.solo ? me.laneToggleActive : me.laneToggle}
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

        <Tooltip align="end" content="Громкость выбранного региона на этой дорожке" side="bottom">
          <label className={me.trackVolumeLabel}>
            <input
              className={me.trackVolumeSlider}
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
        className={me.trackWaveformWrap}
        onClick={stopRowSelection}
        onPointerDown={stopRowSelection}
      >
        <TrackProgressBar disabled={disabled} onSelect={handleSelect} />
      </div>
    </div>
  );
}
