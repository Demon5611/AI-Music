"use client";

import { useEffect, useMemo, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { SongRegionDto } from "@ai-music/shared";
import { AuthenticatedBlobUrl } from "@/shared/ui/authenticated-blob-url";
import { Tooltip } from "@/shared/ui/tooltip";
import { TransportControls } from "@/features/music-editor/transport-controls";
import {
  selectRegionLabel,
  useAudioEditorStore,
} from "@/features/music-editor/store/audio-editor-store";
import { formatTimeMs } from "@/features/music-editor/utils/format-time";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface WaveformTimelineProps {
  audioUrl: string | null;
  regions: SongRegionDto[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
  disabled?: boolean;
}

const REGION_COLORS: Record<string, string> = {
  intro: "rgba(59, 130, 246, 0.25)",
  verse: "rgba(16, 185, 129, 0.25)",
  chorus: "rgba(245, 158, 11, 0.3)",
  bridge: "rgba(139, 92, 246, 0.25)",
  outro: "rgba(236, 72, 153, 0.25)",
  custom: "rgba(148, 163, 184, 0.25)",
};

const REGION_SELECTED_COLORS: Record<string, string> = {
  intro: "rgba(59, 130, 246, 0.42)",
  verse: "rgba(16, 185, 129, 0.42)",
  chorus: "rgba(245, 158, 11, 0.48)",
  bridge: "rgba(139, 92, 246, 0.42)",
  outro: "rgba(236, 72, 153, 0.42)",
  custom: "rgba(148, 163, 184, 0.42)",
};

function buildRulerMarks(durationMs: number, count = 5): number[] {
  if (durationMs <= 0) {
    return [0];
  }

  const step = durationMs / count;

  return Array.from({ length: count + 1 }, (_, index) => Math.round(step * index));
}

function WaveformSurface({
  playbackUrl,
  regions,
  selectedRegionId,
  onSelectRegion,
  disabled,
}: {
  playbackUrl: string;
  regions: SongRegionDto[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(
    null,
  );
  const isWaveformReadyRef = useRef(false);

  const currentTimeMs = useAudioEditorStore((state) => state.currentTimeMs);
  const durationMs = useAudioEditorStore((state) => state.durationMs);
  const zoom = useAudioEditorStore((state) => state.zoom);
  const playbackController = useAudioEditorStore((state) => state.playbackController);
  const setDuration = useAudioEditorStore((state) => state.setDuration);

  const rulerMarks = useMemo(
    () => buildRulerMarks(durationMs),
    [durationMs],
  );

  const selectedRegion = regions.find((region) => region.id === selectedRegionId);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const regionsPlugin = RegionsPlugin.create();
    regionsPluginRef.current = regionsPlugin;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      url: playbackUrl,
      height: 96,
      waveColor: "#64748b",
      progressColor: "#334155",
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 1,
      normalize: true,
      interact: !disabled,
      plugins: [regionsPlugin],
    });

    wavesurferRef.current = wavesurfer;
    isWaveformReadyRef.current = false;

    wavesurfer.on("ready", () => {
      isWaveformReadyRef.current = true;
      setDuration(Math.round(wavesurfer.getDuration() * 1000));
      wavesurfer.zoom(useAudioEditorStore.getState().zoom);
    });

    wavesurfer.on("click", (_relativeX, absoluteX) => {
      playbackController?.seek(Math.round(absoluteX * 1000));
    });

    regionsPlugin.on("region-clicked", (region, event) => {
      event.stopPropagation();
      onSelectRegion(String(region.id));
    });

    return () => {
      isWaveformReadyRef.current = false;
      wavesurfer.destroy();
      wavesurferRef.current = null;
      regionsPluginRef.current = null;
    };
  }, [disabled, onSelectRegion, playbackController, playbackUrl, setDuration]);

  useEffect(() => {
    const wavesurfer = wavesurferRef.current;

    if (!wavesurfer || !isWaveformReadyRef.current) {
      return;
    }

    wavesurfer.zoom(zoom);
  }, [zoom]);

  useEffect(() => {
    const plugin = regionsPluginRef.current;

    if (!plugin) {
      return;
    }

    plugin.clearRegions();

    regions.forEach((region) => {
      const isSelected = region.id === selectedRegionId;

      plugin.addRegion({
        id: region.id,
        start: region.startMs / 1000,
        end: region.endMs / 1000,
        content: isSelected
          ? `Selected: ${selectRegionLabel(region)} — ${formatTimeMs(region.startMs)}–${formatTimeMs(region.endMs)}`
          : selectRegionLabel(region),
        color:
          (isSelected ? REGION_SELECTED_COLORS : REGION_COLORS)[region.label] ??
          REGION_COLORS.custom,
        drag: false,
        resize: isSelected,
      });
    });
  }, [regions, selectedRegionId]);

  useEffect(() => {
    if (!playheadRef.current || durationMs <= 0) {
      return;
    }

    playheadRef.current.style.left = `${(currentTimeMs / durationMs) * 100}%`;
  }, [currentTimeMs, durationMs]);

  return (
    <div className={styles.timelineSurface}>
      <Tooltip block content="Линейка времени помогает точно выбрать нужную часть трека">
        <div className={styles.timeRuler}>
          {rulerMarks.map((markMs) => (
            <span className={styles.timeRulerMark} key={markMs}>
              {formatTimeMs(markMs)}
            </span>
          ))}
        </div>
      </Tooltip>

      <Tooltip
        block
        content="Кликните по waveform, чтобы переместить позицию воспроизведения"
      >
        <div className={styles.waveformWrap}>
          <div className={styles.waveform} ref={containerRef} />
          <div className={styles.playhead} ref={playheadRef} />
          {selectedRegion ? (
            <div
              className={styles.regionSelectionBadge}
              style={{
                left: `${(selectedRegion.startMs / Math.max(durationMs, 1)) * 100}%`,
                width: `${((selectedRegion.endMs - selectedRegion.startMs) / Math.max(durationMs, 1)) * 100}%`,
              }}
            >
              <span
                className={styles.regionHandleLeft}
                title="Потяните край фрагмента, чтобы изменить его начало или конец"
              />
              <span
                className={styles.regionHandleRight}
                title="Потяните край фрагмента, чтобы изменить его начало или конец"
              />
            </div>
          ) : null}
        </div>
      </Tooltip>
    </div>
  );
}

export function WaveformTimeline({
  audioUrl,
  regions,
  selectedRegionId,
  onSelectRegion,
  disabled,
}: WaveformTimelineProps) {
  return (
    <div className={styles.timelineBlock}>
      <div className={styles.timelineHeader}>
        <p className={styles.blockLabel}>Timeline</p>
        <TransportControls disabled={disabled} />
      </div>

      <AuthenticatedBlobUrl src={audioUrl}>
        {(playbackUrl) =>
          playbackUrl ? (
            <WaveformSurface
              disabled={disabled}
              playbackUrl={playbackUrl}
              regions={regions}
              selectedRegionId={selectedRegionId}
              onSelectRegion={onSelectRegion}
            />
          ) : (
            <p className={styles.panelHint}>Загрузка waveform...</p>
          )
        }
      </AuthenticatedBlobUrl>

      <p className={styles.timelineHint}>
        Наведите и выберите фрагмент для редактирования
      </p>
    </div>
  );
}
