"use client";

import { Tooltip } from "@/shared/ui/tooltip";
import {
  selectRegionLabel,
  selectSelectedRegion,
  useAudioEditorStore,
} from "@/features/music-editor/store/audio-editor-store";
import { formatTimeRangeMs } from "@/features/music-editor/utils/format-time";
import styles from "@/features/music-editor/styles/music-editor.module.css";

export function SelectedContextPanel() {
  const selectedRegion = useAudioEditorStore(selectSelectedRegion);
  const linkedTracks = useAudioEditorStore((state) => state.linkedTracks);
  const selectedTrackId = useAudioEditorStore((state) => state.selectedTrackId);
  const tracks = useAudioEditorStore((state) => state.tracks);

  const trackLabel = linkedTracks
    ? "Vocal + Instrumental"
    : tracks.find((track) => track.id === selectedTrackId)?.label ?? "—";

  return (
    <Tooltip
      block
      content="Здесь показано, к какому фрагменту и дорожке будет применено действие"
    >
      <div className={styles.contextPanel}>
        <p className={styles.contextTitle}>Editing:</p>
        {selectedRegion ? (
          <div className={styles.contextGrid}>
            <span>Track: {trackLabel}</span>
            <span>Region: {selectRegionLabel(selectedRegion)}</span>
            <span>
              Time:{" "}
              {formatTimeRangeMs(selectedRegion.startMs, selectedRegion.endMs)}
            </span>
          </div>
        ) : (
          <p className={styles.panelHint}>
            Кликните timeline, чтобы выбрать регион под playhead, затем примените
            Region actions. Split режет в позиции playhead.
          </p>
        )}
      </div>
    </Tooltip>
  );
}
