"use client";

import { usePlaylistControls } from "@waveform-playlist/browser";
import { useEffect, useRef, type RefObject } from "react";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { parseTimelineClipId } from "@/features/music-editor/utils/waveform-playlist-utils";

interface PlaylistRegionBridgeProps {
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
  containerRef: RefObject<HTMLElement | null>;
}

function resolveClipIdFromTarget(target: Element): string | null {
  const header = target.closest("[data-clip-id]");

  if (header) {
    return header.getAttribute("data-clip-id");
  }

  const container = target.closest("[data-clip-container]");

  if (!container) {
    return null;
  }

  return container.querySelector("[data-clip-id]")?.getAttribute("data-clip-id") ?? null;
}

function collapseTimeSelection(
  setSelection: (start: number, end: number) => void,
): void {
  const timeSec = useAudioEditorStore.getState().currentTimeMs / 1000;
  setSelection(timeSec, timeSec);
}

export function PlaylistRegionBridge({
  selectedRegionId,
  onSelectRegion,
  containerRef,
}: PlaylistRegionBridgeProps) {
  const controls = usePlaylistControls();
  const controlsRef = useRef(controls);
  const onSelectRegionRef = useRef(onSelectRegion);
  const setSelectedTrack = useAudioEditorStore((state) => state.setSelectedTrack);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    onSelectRegionRef.current = onSelectRegion;
  }, [onSelectRegion]);

  useEffect(() => {
    if (!selectedRegionId) {
      return;
    }

    collapseTimeSelection(controlsRef.current.setSelection);
  }, [selectedRegionId]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-boundary-edge]")) {
        return;
      }

      const clipId = resolveClipIdFromTarget(target);

      if (!clipId) {
        return;
      }

      const parsed = parseTimelineClipId(clipId);

      if (!parsed) {
        return;
      }

      collapseTimeSelection(controlsRef.current.setSelection);
      onSelectRegionRef.current(parsed.regionId);
      setSelectedTrack(parsed.trackId);
    }

    container.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [containerRef, setSelectedTrack]);

  return null;
}
