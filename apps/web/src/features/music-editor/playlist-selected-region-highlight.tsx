"use client";

import type { EditorTrackId } from "@ai-music/shared";
import { useEffect, type RefObject } from "react";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { parseTimelineClipId } from "@/features/music-editor/utils/waveform-playlist-utils";

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

function resolveHighlightTrackIds(
  linkedTracks: boolean,
  selectedTrackId: EditorTrackId | null,
): EditorTrackId[] | null {
  if (linkedTracks) {
    return ["vocal", "instrumental"];
  }

  if (selectedTrackId) {
    return [selectedTrackId];
  }

  return null;
}

function markSelectedRegionClips(
  container: HTMLElement,
  selectedRegionId: string,
  trackIds: EditorTrackId[] | null,
): void {
  container.querySelectorAll("[data-clip-id]").forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    const clipId = element.getAttribute("data-clip-id");

    if (!clipId) {
      return;
    }

    const parsed = parseTimelineClipId(clipId);

    if (!parsed || parsed.regionId !== selectedRegionId) {
      return;
    }

    if (trackIds && !trackIds.includes(parsed.trackId)) {
      return;
    }

    const clipContainer = element.closest("[data-clip-container]");

    if (clipContainer instanceof HTMLElement) {
      clipContainer.setAttribute("data-editor-region-selected", "true");
    }
  });
}

function applySelectedRegionHighlight(
  container: HTMLElement,
  selectedRegionId: string | null,
): void {
  clearSelectedRegionMarkers(container);

  if (!selectedRegionId) {
    return;
  }

  const { linkedTracks, selectedTrackId } = useAudioEditorStore.getState();
  const trackIds = resolveHighlightTrackIds(linkedTracks, selectedTrackId);
  markSelectedRegionClips(container, selectedRegionId, trackIds);
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

    let rafId: number | null = null;

    const scheduleHighlight = () => {
      if (rafId !== null) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        applySelectedRegionHighlight(container, selectedRegionId);
      });
    };

    scheduleHighlight();

    const observer = new MutationObserver(scheduleHighlight);
    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      clearSelectedRegionMarkers(container);
    };
  }, [
    containerRef,
    linkedTracks,
    regionsLayoutKey,
    selectedRegionId,
    selectedTrackId,
  ]);

  return null;
}
