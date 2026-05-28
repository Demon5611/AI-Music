"use client";

import type { AudioTrackDto, EditOperation } from "@ai-music/shared";
import { Tooltip } from "@/shared/ui/tooltip";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface MixerPanelProps {
  tracks: AudioTrackDto[];
  operations: EditOperation[];
  selectedRegionId: string | null;
  selectedTrackId: AudioTrackDto["id"] | null;
  onSelectTrack: (trackId: AudioTrackDto["id"]) => void;
  onApplyGain: (trackId: AudioTrackDto["id"], gainDb: number) => void;
  onMuteTrack: (trackId: AudioTrackDto["id"]) => void;
  disabled: boolean;
}

function resolveTrackDisplay(
  trackId: AudioTrackDto["id"],
  regionId: string | null,
  operations: EditOperation[],
): { muted: boolean; gainDb: number } {
  if (!regionId) {
    return { muted: false, gainDb: 0 };
  }

  let muted = false;
  let gainDb = 0;

  for (const operation of operations) {
    if (!("regionId" in operation) || operation.regionId !== regionId) {
      continue;
    }

    if (operation.type === "SET_VOLUME" && operation.trackId === trackId) {
      gainDb = operation.gainDb;
    }

    if (operation.type === "MUTE_TRACK" && operation.trackId === trackId) {
      muted = operation.muted;
    }
  }

  return { muted, gainDb };
}

const VOLUME_TOOLTIPS: Record<AudioTrackDto["id"], string> = {
  vocal: "Сделать голос громче или тише",
  instrumental: "Сделать музыку громче или тише",
};

export function MixerPanel({
  tracks,
  operations,
  selectedRegionId,
  selectedTrackId,
  onSelectTrack,
  onApplyGain,
  onMuteTrack,
  disabled,
}: MixerPanelProps) {
  const previewTracks = useAudioEditorStore((state) => state.previewTracks);
  const setPreviewGain = useAudioEditorStore((state) => state.setPreviewGain);
  const togglePreviewSolo = useAudioEditorStore((state) => state.togglePreviewSolo);

  return (
    <Tooltip block content="Здесь можно быстро настроить баланс вокала и музыки">
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Mixer</h3>
        <div className={styles.mixerList}>
          {tracks.map((track) => {
            const saved = resolveTrackDisplay(
              track.id,
              selectedRegionId,
              operations,
            );
            const preview = previewTracks[track.id];
            const previewChanged = preview.gainDb !== saved.gainDb;

            return (
              <div
                className={
                  selectedTrackId === track.id
                    ? styles.mixerRowSelected
                    : styles.mixerRow
                }
                key={track.id}
              >
                <button
                  className={styles.mixerTrackButton}
                  disabled={disabled}
                  type="button"
                  onClick={() => onSelectTrack(track.id)}
                >
                  {track.label}
                </button>

                <Tooltip content={VOLUME_TOOLTIPS[track.id]}>
                  <label className={styles.mixerSliderLabel}>
                    <input
                      className={styles.mixerSlider}
                      disabled={disabled}
                      max={6}
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

                {previewChanged ? (
                  <button
                    className={styles.mixerApplyButton}
                    disabled={disabled || !selectedRegionId}
                    type="button"
                    onClick={() => onApplyGain(track.id, preview.gainDb)}
                  >
                    Apply
                  </button>
                ) : (
                  <span className={styles.mixerSavedValue}>
                    {saved.muted ? "Muted" : `${saved.gainDb} dB`}
                  </span>
                )}

                <Tooltip content="Отключить эту дорожку в preview">
                  <button
                    className={styles.laneToggle}
                    disabled={disabled || !selectedRegionId}
                    type="button"
                    onClick={() => onMuteTrack(track.id)}
                  >
                    M
                  </button>
                </Tooltip>

                <Tooltip content="Слушать только эту дорожку">
                  <button
                    className={
                      preview.solo ? styles.laneToggleActive : styles.laneToggle
                    }
                    disabled={disabled}
                    type="button"
                    onClick={() => togglePreviewSolo(track.id)}
                  >
                    S
                  </button>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
    </Tooltip>
  );
}
