"use client";

import type { AudioTrackDto, EditOperation } from "@ai-music/shared";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface MixerPanelProps {
  tracks: AudioTrackDto[];
  operations: EditOperation[];
  selectedRegionId: string | null;
  selectedTrackId: AudioTrackDto["id"] | null;
  onSelectTrack: (trackId: AudioTrackDto["id"]) => void;
  onVocalQuieter: () => void;
  onInstrumentalQuieter: () => void;
  onMuteVocal: () => void;
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

export function MixerPanel({
  tracks,
  operations,
  selectedRegionId,
  selectedTrackId,
  onSelectTrack,
  onVocalQuieter,
  onInstrumentalQuieter,
  onMuteVocal,
  disabled,
}: MixerPanelProps) {
  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Mixer</h3>
      <div className={styles.trackList}>
        {tracks.map((track) => {
          const display = resolveTrackDisplay(
            track.id,
            selectedRegionId,
            operations,
          );

          return (
          <button
            className={
              selectedTrackId === track.id
                ? styles.mixerTrackSelected
                : styles.mixerTrack
            }
            disabled={disabled}
            key={track.id}
            type="button"
            onClick={() => onSelectTrack(track.id)}
          >
            <span>{track.label}</span>
            <span>
              {display.muted ? "Muted" : `${display.gainDb} dB`}
            </span>
          </button>
          );
        })}
      </div>
      <div className={styles.toolbarRow}>
        <button
          className={styles.toolButton}
          disabled={disabled}
          type="button"
          onClick={onVocalQuieter}
        >
          Сделать голос тише
        </button>
        <button
          className={styles.toolButton}
          disabled={disabled}
          type="button"
          onClick={onInstrumentalQuieter}
        >
          Сделать музыку тише
        </button>
        <button
          className={styles.toolButton}
          disabled={disabled}
          type="button"
          onClick={onMuteVocal}
        >
          Убрать вокал
        </button>
      </div>
    </div>
  );
}
