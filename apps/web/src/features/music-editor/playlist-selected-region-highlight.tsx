"use client";

import type { EditorTrackId } from "@ai-music/shared";
import { useEffect, type RefObject } from "react";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";

interface PlaylistSelectedRegionHighlightProps {
  selectedRegionId: string | null;
  regionsLayoutKey: string;
  containerRef: RefObject<HTMLElement | null>;
}

function clearSelectedRegionMarkers(container: HTMLElement): void {
  container
    .querySelectorAll("[data-editor-region-selected]")
    .forEach((element) => {
      element.removeAttribute("data-editor-region-selected");
    });
}

function markSelectedRegionClips(
  container: HTMLElement,
  selectedRegionId: string,
  trackIds: EditorTrackId[],
): void {
  for (const trackId of trackIds) {
    const clipId = `${trackId}-${selectedRegionId}`;
    const clipElement = container.querySelector(`[data-clip-id="${clipId}"]`);
    const clipContainer = clipElement?.closest("[data-clip-container]");

    if (clipContainer instanceof HTMLElement) {
      clipContainer.setAttribute("data-editor-region-selected", "true");
    }
  }
}

export function PlaylistSelectedRegionHighlight({
  selectedRegionId,
  regionsLayoutKey,
  containerRef,
}: PlaylistSelectedRegionHighlightProps) {
  const linkedTracks = useAudioEditorStore((state) => state.linkedTracks);
  const selectedTrackId = useAudioEditorStore((state) => state.selectedTrackId);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    clearSelectedRegionMarkers(container);

    if (!selectedRegionId) {
      return;
    }

    const trackIds: EditorTrackId[] = linkedTracks
      ? ["vocal", "instrumental"]
      : selectedTrackId
        ? [selectedTrackId]
        : [];

    markSelectedRegionClips(container, selectedRegionId, trackIds);
  }, [
    containerRef,
    linkedTracks,
    regionsLayoutKey,
    selectedRegionId,
    selectedTrackId,
  ]);

  return null;
}
