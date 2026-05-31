"use client";

import type { SongRegionDto } from "@ai-music/shared";
import { useEffect, type RefObject } from "react";
import { selectRegionLabel } from "@/features/music-editor/store/audio-editor-store";
import { parseTimelineClipId } from "@/features/music-editor/utils/waveform-playlist-utils";

interface PlaylistClipLabelBridgeProps {
  regions: SongRegionDto[];
  regionsLayoutKey: string;
  containerRef: RefObject<HTMLElement | null>;
}

function applyClipRegionLabels(container: HTMLElement, labelByRegionId: Map<string, string>): void {
  container.querySelectorAll("[data-clip-id]").forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    const clipId = element.getAttribute("data-clip-id");

    if (!clipId) {
      return;
    }

    const parsed = parseTimelineClipId(clipId);

    if (!parsed) {
      return;
    }

    const label = labelByRegionId.get(parsed.regionId);

    if (!label) {
      return;
    }

    const textTarget = element.querySelector("span");

    if (!(textTarget instanceof HTMLElement)) {
      return;
    }

    if (textTarget.textContent === label) {
      return;
    }

    textTarget.textContent = label;
    element.setAttribute("title", label);
  });
}

export function PlaylistClipLabelBridge({
  regions,
  regionsLayoutKey,
  containerRef,
}: PlaylistClipLabelBridgeProps) {
  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const labelByRegionId = new Map(
      regions.map((region) => [region.id, selectRegionLabel(region)]),
    );

    const syncLabels = () => {
      applyClipRegionLabels(container, labelByRegionId);
    };

    syncLabels();

    const observer = new MutationObserver(syncLabels);
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [containerRef, regions, regionsLayoutKey]);

  return null;
}
