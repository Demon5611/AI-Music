"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { SongRegionDto } from "@ai-music/shared";
import { AuthenticatedBlobUrl } from "@/shared/ui/authenticated-blob-url";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface WaveformTimelineProps {
  audioUrl: string | null;
  regions: SongRegionDto[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
}

const REGION_COLORS: Record<string, string> = {
  intro: "rgba(59, 130, 246, 0.25)",
  verse: "rgba(16, 185, 129, 0.25)",
  chorus: "rgba(245, 158, 11, 0.3)",
  bridge: "rgba(139, 92, 246, 0.25)",
  outro: "rgba(236, 72, 153, 0.25)",
  custom: "rgba(148, 163, 184, 0.25)",
};

function WaveformSurface({
  playbackUrl,
  regions,
  selectedRegionId,
  onSelectRegion,
}: {
  playbackUrl: string;
  regions: SongRegionDto[];
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const regionsPlugin = RegionsPlugin.create();
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      url: playbackUrl,
      height: 96,
      waveColor: "#64748b",
      progressColor: "#0f172a",
      cursorColor: "#2563eb",
      barWidth: 2,
      barGap: 1,
      normalize: true,
      plugins: [regionsPlugin],
    });

    regions.forEach((region) => {
      regionsPlugin.addRegion({
        id: region.id,
        start: region.startMs / 1000,
        end: region.endMs / 1000,
        content: region.label,
        color: REGION_COLORS[region.label] ?? REGION_COLORS.custom,
        drag: false,
        resize: false,
      });
    });

    regionsPlugin.on("region-clicked", (region, event) => {
      event.stopPropagation();
      onSelectRegion(String(region.id));
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [onSelectRegion, playbackUrl, regions]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const regionElements = containerRef.current.querySelectorAll("[data-id]");

    regionElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const isSelected = htmlElement.dataset.id === selectedRegionId;
      htmlElement.style.outline = isSelected ? "2px solid #2563eb" : "";
    });
  }, [selectedRegionId]);

  return <div className={styles.waveform} ref={containerRef} />;
}

export function WaveformTimeline({
  audioUrl,
  regions,
  selectedRegionId,
  onSelectRegion,
}: WaveformTimelineProps) {
  return (
    <div className={styles.timelineBlock}>
      <p className={styles.blockLabel}>Timeline</p>
      <AuthenticatedBlobUrl src={audioUrl}>
        {(playbackUrl) =>
          playbackUrl ? (
            <WaveformSurface
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
    </div>
  );
}
