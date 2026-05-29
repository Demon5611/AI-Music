"use client";

import { useCallback, useEffect, useMemo, useRef, type MouseEvent } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { SongRegionDto } from "@ai-music/shared";
import { Tooltip } from "@/shared/ui/tooltip";
import { TransportControls } from "@/features/music-editor/transport-controls";
import {
  selectRegionLabel,
  useAudioEditorStore,
} from "@/features/music-editor/store/audio-editor-store";
import {
  getWaveSurferScrollElement,
  resolveWaveSurferClickTimeMs,
  scrollToPlayhead,
  seekTimeline,
} from "@/features/music-editor/utils/timeline-sync";
import { formatTimeMs } from "@/features/music-editor/utils/format-time";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface WaveformTimelineProps {
  regions: SongRegionDto[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
  onResizeRegion: (regionId: string, startMs: number, endMs: number) => void;
  disabled?: boolean;
}

const REGION_COLORS: Record<string, string> = {
  intro: "rgba(59, 130, 246, 0.22)",
  verse: "rgba(16, 185, 129, 0.22)",
  chorus: "rgba(245, 158, 11, 0.28)",
  bridge: "rgba(139, 92, 246, 0.22)",
  outro: "rgba(236, 72, 153, 0.22)",
  custom: "rgba(148, 163, 184, 0.22)",
};

const REGION_SELECTED_COLORS: Record<string, string> = {
  intro: "rgba(59, 130, 246, 0.45)",
  verse: "rgba(16, 185, 129, 0.45)",
  chorus: "rgba(245, 158, 11, 0.52)",
  bridge: "rgba(139, 92, 246, 0.45)",
  outro: "rgba(236, 72, 153, 0.45)",
  custom: "rgba(148, 163, 184, 0.45)",
};

const RESIZE_DEBOUNCE_MS = 350;

function buildRulerMarks(durationMs: number, count = 5): number[] {
  if (durationMs <= 0) {
    return [0];
  }

  const step = durationMs / count;

  return Array.from({ length: count + 1 }, (_, index) => Math.round(step * index));
}

function WaveformSurface({
  waveformUrl,
  regions,
  selectedRegionId,
  onSelectRegion,
  onResizeRegion,
  disabled,
}: {
  waveformUrl: string;
  regions: SongRegionDto[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
  onResizeRegion: (regionId: string, startMs: number, endMs: number) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(
    null,
  );
  const isWaveformReadyRef = useRef(false);
  const isSyncingRegionsRef = useRef(false);
  const resizeDebounceRef = useRef<number | null>(null);
  const onSelectRegionRef = useRef(onSelectRegion);
  const onResizeRegionRef = useRef(onResizeRegion);

  const currentTimeMs = useAudioEditorStore((state) => state.currentTimeMs);
  const durationMs = useAudioEditorStore((state) => state.durationMs);
  const isPlaying = useAudioEditorStore((state) => state.isPlaying);
  const zoom = useAudioEditorStore((state) => state.zoom);
  const setDuration = useAudioEditorStore((state) => state.setDuration);

  useEffect(() => {
    onSelectRegionRef.current = onSelectRegion;
    onResizeRegionRef.current = onResizeRegion;
  }, [onResizeRegion, onSelectRegion]);

  const rulerMarks = useMemo(
    () => buildRulerMarks(durationMs),
    [durationMs],
  );

  const handleRulerClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (disabled || durationMs <= 0) {
        return;
      }

      const wavesurfer = wavesurferRef.current;

      if (wavesurfer && isWaveformReadyRef.current) {
        seekTimeline(
          resolveWaveSurferClickTimeMs(wavesurfer, event.clientX),
        );
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const progress = (event.clientX - rect.left) / Math.max(rect.width, 1);
      seekTimeline(Math.round(progress * durationMs));
    },
    [disabled, durationMs],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const regionsPlugin = RegionsPlugin.create();
    regionsPluginRef.current = regionsPlugin;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      url: waveformUrl,
      height: 96,
      waveColor: "#64748b",
      progressColor: "#94a3b8",
      cursorColor: "#2563eb",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      normalize: true,
      interact: !disabled,
      plugins: [regionsPlugin],
    });

    wavesurferRef.current = wavesurfer;
    isWaveformReadyRef.current = false;
    wavesurfer.setMuted(true);

    wavesurfer.on("ready", () => {
      isWaveformReadyRef.current = true;
      wavesurfer.setMuted(true);
      const waveformDurationMs = Math.round(wavesurfer.getDuration() * 1000);
      const storeDuration = useAudioEditorStore.getState().durationMs;

      if (storeDuration <= 0 && waveformDurationMs > 0) {
        setDuration(waveformDurationMs);
      }

      wavesurfer.zoom(useAudioEditorStore.getState().zoom);
      wavesurfer.setTime(useAudioEditorStore.getState().currentTimeMs / 1000);
    });

    wavesurfer.on("interaction", (newTimeSec) => {
      seekTimeline(Math.round(newTimeSec * 1000));
    });

    regionsPlugin.on("region-clicked", (region, event) => {
      const durationSec = wavesurfer.getDuration();
      let timeMs = Math.round(region.start * 1000);

      if (durationSec > 0 && event.target instanceof HTMLElement) {
        const regionRect = event.target.getBoundingClientRect();
        const regionWidth = Math.max(regionRect.width, 1);
        const fraction = Math.min(
          1,
          Math.max(0, (event.clientX - regionRect.left) / regionWidth),
        );
        timeMs = Math.round(
          (region.start + fraction * (region.end - region.start)) * 1000,
        );
      }

      wavesurfer.setTime(timeMs / 1000);
      seekTimeline(timeMs);
      onSelectRegionRef.current(String(region.id));
    });

    regionsPlugin.on("region-updated", (region) => {
      if (isSyncingRegionsRef.current) {
        return;
      }

      if (resizeDebounceRef.current !== null) {
        window.clearTimeout(resizeDebounceRef.current);
      }

      resizeDebounceRef.current = window.setTimeout(() => {
        onResizeRegionRef.current(
          String(region.id),
          Math.round(region.start * 1000),
          Math.round(region.end * 1000),
        );
      }, RESIZE_DEBOUNCE_MS);
    });

    return () => {
      if (resizeDebounceRef.current !== null) {
        window.clearTimeout(resizeDebounceRef.current);
      }

      isWaveformReadyRef.current = false;
      wavesurfer.destroy();
      wavesurferRef.current = null;
      regionsPluginRef.current = null;
    };
  }, [disabled, setDuration, waveformUrl]);

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

    isSyncingRegionsRef.current = true;
    plugin.clearRegions();

    regions.forEach((region) => {
      const isSelected = region.id === selectedRegionId;

      plugin.addRegion({
        id: region.id,
        start: region.startMs / 1000,
        end: region.endMs / 1000,
        content: isSelected
          ? `${selectRegionLabel(region)} — ${formatTimeMs(region.startMs)}–${formatTimeMs(region.endMs)}`
          : selectRegionLabel(region),
        color:
          (isSelected ? REGION_SELECTED_COLORS : REGION_COLORS)[region.label] ??
          REGION_COLORS.custom,
        drag: false,
        resize: isSelected,
      });
    });

    isSyncingRegionsRef.current = false;
  }, [regions, selectedRegionId]);

  useEffect(() => {
    const wavesurfer = wavesurferRef.current;

    if (!wavesurfer || !isWaveformReadyRef.current) {
      return;
    }

    const durationSec = wavesurfer.getDuration();

    if (durationSec <= 0) {
      return;
    }

    wavesurfer.setTime(currentTimeMs / 1000);

    const wrapper = wavesurfer.getWrapper();

    if (isPlaying && wrapper instanceof HTMLElement) {
      scrollToPlayhead(
        getWaveSurferScrollElement(wavesurfer),
        currentTimeMs,
        durationMs,
      );
    }
  }, [currentTimeMs, durationMs, isPlaying]);

  return (
    <div className={styles.timelineSurface}>
      <Tooltip block content="Линейка времени помогает точно выбрать нужную часть трека">
        <div
          className={styles.timeRulerInteractive}
          onClick={handleRulerClick}
          onKeyDown={() => undefined}
          role="presentation"
        >
          {rulerMarks.map((markMs) => (
            <span className={styles.timeRulerMark} key={markMs}>
              {formatTimeMs(markMs)}
            </span>
          ))}
        </div>
      </Tooltip>

      <Tooltip
        block
        content="Клик перемещает playhead. Клик по цветному блоку также выбирает фрагмент"
      >
        <div className={styles.waveformScroll}>
          <div className={styles.waveform} ref={containerRef} />
        </div>
      </Tooltip>
    </div>
  );
}

export function WaveformTimeline({
  regions,
  selectedRegionId,
  onSelectRegion,
  onResizeRegion,
  disabled,
}: WaveformTimelineProps) {
  const stemMedia = useAudioEditorStore((state) => state.stemMedia);
  const waveformUrl =
    stemMedia.instrumental?.src ?? stemMedia.vocal?.src ?? null;

  return (
    <div className={styles.timelineBlock}>
      <div className={styles.timelineHeader}>
        <p className={styles.blockLabel}>Timeline</p>
        <TransportControls disabled={disabled} />
      </div>

      {waveformUrl ? (
        <WaveformSurface
          disabled={disabled}
          waveformUrl={waveformUrl}
          regions={regions}
          selectedRegionId={selectedRegionId}
          onResizeRegion={onResizeRegion}
          onSelectRegion={onSelectRegion}
        />
      ) : (
        <p className={styles.panelHint}>Загрузка waveform...</p>
      )}

      <p className={styles.timelineHint}>
        Клик по timeline перемещает playhead. Перетаскивание границ выбранного
        фрагмента сохраняет новые bounds.
      </p>
    </div>
  );
}
