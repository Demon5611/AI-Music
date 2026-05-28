"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import type { AudioTrackDto } from "@ai-music/shared";
import { AuthenticatedBlobUrl } from "@/shared/ui/authenticated-blob-url";
import { Tooltip } from "@/shared/ui/tooltip";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { seekTimeline } from "@/features/music-editor/utils/timeline-sync";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface TrackLaneProps {
  track: AudioTrackDto;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

const TRACK_TOOLTIPS: Record<AudioTrackDto["id"], string> = {
  vocal: "Дорожка вокала. Можно сделать тише, отключить или заменить голос",
  instrumental: "Музыкальная дорожка. Можно менять громкость или отключать",
};

function MiniWaveform({
  playbackUrl,
  onSelect,
}: {
  playbackUrl: string;
  onSelect: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentTimeMs = useAudioEditorStore((state) => state.currentTimeMs);
  const durationMs = useAudioEditorStore((state) => state.durationMs);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      url: playbackUrl,
      height: 48,
      waveColor: "#94a3b8",
      progressColor: "#475569",
      cursorColor: "transparent",
      barWidth: 1,
      barGap: 1,
      normalize: true,
      interact: true,
    });

    wavesurfer.on("interaction", (newTimeSec) => {
      onSelect();
      seekTimeline(Math.round(newTimeSec * 1000));
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [onSelect, playbackUrl]);

  useEffect(() => {
    if (!containerRef.current || durationMs <= 0) {
      return;
    }

    const progress = currentTimeMs / durationMs;
    const canvas = containerRef.current.querySelector("canvas");

    if (canvas instanceof HTMLCanvasElement) {
      canvas.style.opacity = "1";
    }

    void progress;
  }, [currentTimeMs, durationMs]);

  return <div className={styles.trackWaveform} ref={containerRef} />;
}

export function TrackLane({
  track,
  selected,
  disabled = false,
  onSelect,
}: TrackLaneProps) {
  const preview = useAudioEditorStore((state) => state.previewTracks[track.id]);
  const togglePreviewMute = useAudioEditorStore((state) => state.togglePreviewMute);
  const togglePreviewSolo = useAudioEditorStore((state) => state.togglePreviewSolo);
  const setPreviewGain = useAudioEditorStore((state) => state.setPreviewGain);

  return (
    <div
      className={selected ? styles.trackLaneRowSelected : styles.trackLaneRow}
    >
      <Tooltip block content={TRACK_TOOLTIPS[track.id]}>
        <button
          className={styles.trackLaneHeader}
          disabled={disabled}
          type="button"
          onClick={onSelect}
        >
          <span className={styles.trackLaneLabel}>{track.label}</span>
        </button>
      </Tooltip>

      <div className={styles.trackLaneControls}>
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

      <AuthenticatedBlobUrl src={track.audioUrl}>
        {(playbackUrl) =>
          playbackUrl ? (
            <div className={styles.trackWaveformWrap}>
              <MiniWaveform onSelect={onSelect} playbackUrl={playbackUrl} />
            </div>
          ) : (
            <p className={styles.panelHint}>Waveform недоступен</p>
          )
        }
      </AuthenticatedBlobUrl>
    </div>
  );
}
