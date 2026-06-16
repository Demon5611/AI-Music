"use client";

import { Tooltip } from "@/shared/ui/tooltip";
import {
  selectRegionLabel,
  selectSelectedRegion,
  useAudioEditorStore,
} from "@/features/music-editor/store/audio-editor-store";
import { formatTimeRangeMs } from "@/features/music-editor/utils/format-time";
import { me } from "@/features/music-editor/music-editor-classes";

export function SelectedContextPanel() {
  const selectedRegion = useAudioEditorStore(selectSelectedRegion);
  const linkedTracks = useAudioEditorStore((state) => state.linkedTracks);
  const selectedTrackId = useAudioEditorStore((state) => state.selectedTrackId);
  const timelineSelectionSec = useAudioEditorStore(
    (state) => state.timelineSelectionSec,
  );
  const tracks = useAudioEditorStore((state) => state.tracks);

  const trackLabel = linkedTracks
    ? "Vocal + Instrumental"
    : tracks.find((track) => track.id === selectedTrackId)?.label ?? "—";

  return (
    <Tooltip
      block
      content="Здесь показано, к какому фрагменту и дорожке будет применено действие"
    >
      <div className={me.contextPanel}>
        <p className={me.contextTitle}>Editing:</p>
        {selectedRegion ? (
          <div className={me.contextGrid}>
            <span>Track: {trackLabel}</span>
            <span>Region: {selectRegionLabel(selectedRegion)}</span>
            <span>
              Time:{" "}
              {formatTimeRangeMs(selectedRegion.startMs, selectedRegion.endMs)}
            </span>
            {timelineSelectionSec ? (
              <span>
                Selection:{" "}
                {formatTimeRangeMs(
                  Math.round(timelineSelectionSec.startSec * 1000),
                  Math.round(timelineSelectionSec.endSec * 1000),
                )}
              </span>
            ) : null}
          </div>
        ) : (
          <p className={me.panelHint}>
            Кликните timeline, чтобы выбрать регион. Выделите фрагмент на
            waveform и нажмите Delete, чтобы вырезать его. Split режет в позиции
            playhead.
          </p>
        )}
      </div>
    </Tooltip>
  );
}
