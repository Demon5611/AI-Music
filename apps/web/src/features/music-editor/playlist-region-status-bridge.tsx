"use client";

import { usePlaylistData } from "@waveform-playlist/browser";
import type { SongRegionDto } from "@ai-music/shared";
import { useEffect, useMemo, type RefObject } from "react";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { resolveClipContainersForRegion } from "@/features/music-editor/utils/timeline-clip-dom-utils";

interface PlaylistRegionStatusBridgeProps {
  regions: SongRegionDto[];
  regionsLayoutKey: string;
  containerRef: RefObject<HTMLElement | null>;
}

function clearRegionStatusMarkers(container: HTMLElement): void {
  container
    .querySelectorAll(
      "[data-editor-region-replacing], [data-editor-region-replaced]",
    )
    .forEach((element) => {
      element.removeAttribute("data-editor-region-replacing");
      element.removeAttribute("data-editor-region-replaced");
    });
}

function applyRegionStatusMarkers(
  container: HTMLElement,
  tracks: ReturnType<typeof usePlaylistData>["tracks"],
  replacingRegionId: string | null,
  replacedRegionIds: string[],
): void {
  clearRegionStatusMarkers(container);

  if (replacingRegionId) {
    const clipContainers = resolveClipContainersForRegion(
      container,
      tracks,
      replacingRegionId,
      ["vocal", "instrumental"],
    );

    clipContainers.forEach((clipContainer) => {
      clipContainer.setAttribute("data-editor-region-replacing", "true");
    });
  }

  for (const regionId of replacedRegionIds) {
    const clipContainers = resolveClipContainersForRegion(
      container,
      tracks,
      regionId,
      ["vocal", "instrumental"],
    );

    clipContainers.forEach((clipContainer) => {
      clipContainer.setAttribute("data-editor-region-replaced", "true");
    });
  }
}

export function PlaylistRegionStatusBridge({
  regions,
  regionsLayoutKey,
  containerRef,
}: PlaylistRegionStatusBridgeProps) {
  const { tracks } = usePlaylistData();
  const songPendingAction = useAudioEditorStore((state) => state.songPendingAction);
  const songPendingRegionId = useAudioEditorStore((state) => state.songPendingRegionId);
  const replacingRegionId =
    songPendingAction === "replace_section" ? songPendingRegionId : null;
  const replacedRegionIds = useMemo(
    () =>
      regions
        .filter((region) => region.replacementAudioUrl)
        .map((region) => region.id),
    [regions],
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let rafId: number | null = null;

    const scheduleMarkers = () => {
      if (rafId !== null) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        applyRegionStatusMarkers(
          container,
          tracks,
          replacingRegionId,
          replacedRegionIds,
        );
      });
    };

    scheduleMarkers();

    const observer = new MutationObserver(scheduleMarkers);
    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      clearRegionStatusMarkers(container);
    };
  }, [
    containerRef,
    regionsLayoutKey,
    replacedRegionIds,
    replacingRegionId,
    tracks,
  ]);

  return null;
}
