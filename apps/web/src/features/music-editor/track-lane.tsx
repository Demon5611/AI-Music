"use client";

import type { AudioTrackDto } from "@ai-music/shared";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface TrackLaneProps {
  track: AudioTrackDto;
  selected: boolean;
  onSelect: () => void;
}

export function TrackLane({ track, selected, onSelect }: TrackLaneProps) {
  return (
    <button
      className={selected ? styles.trackLaneSelected : styles.trackLane}
      type="button"
      onClick={onSelect}
    >
      <span className={styles.trackLaneLabel}>{track.label}</span>
      <span className={styles.trackLaneMeta}>
        {track.muted ? "Muted" : `${track.gainDb.toFixed(1)} dB`}
      </span>
    </button>
  );
}
