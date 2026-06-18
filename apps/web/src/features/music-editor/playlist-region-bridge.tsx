"use client";

import {
  usePlaylistControls,
  usePlaylistData,
  usePlaylistState,
} from "@waveform-playlist/browser";
import type { ClipTrack } from "@waveform-playlist/core";
import type { EditorTrackId } from "@ai-music/shared";
import { isTimelineRangeSelection } from "@ai-music/shared";
import { useEffect, useRef, type RefObject } from "react";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import {
  parseTimelineClipId,
  resolvePlaylistTrackForEditorTrack,
  resolveTimelineSelectionMatch,
} from "@/features/music-editor/utils/waveform-playlist-utils";

interface PlaylistRegionBridgeProps {
  selectedRegionId: string | null;
  regionsLayoutKey: string;
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

function resolveRegionFromTimelineSelection(
  tracks: ClipTrack[],
  sampleRate: number,
  selectionStartSec: number,
  selectionEndSec: number,
  playlistTrackId: string | null,
): { regionId: string; trackId: EditorTrackId } | null {
  const match = resolveTimelineSelectionMatch(
    tracks,
    sampleRate,
    selectionStartSec,
    selectionEndSec,
    { playlistTrackId },
  );

  if (!match) {
    return null;
  }

  return {
    regionId: match.regionId,
    trackId: match.trackId,
  };
}

export function PlaylistRegionBridge({
  selectedRegionId,
  regionsLayoutKey,
  onSelectRegion,
  containerRef,
}: PlaylistRegionBridgeProps) {
  const controls = usePlaylistControls();
  const { tracks, sampleRate } = usePlaylistData();
  const { selectionStart, selectionEnd, selectedTrackId: playlistTrackId } =
    usePlaylistState();
  const controlsRef = useRef(controls);
  const onSelectRegionRef = useRef(onSelectRegion);
  const selectTrackFromTimeline = useAudioEditorStore(
    (state) => state.selectTrackFromTimeline,
  );
  const skipSelectionSyncRef = useRef(false);
  const tracksRef = useRef(tracks);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    onSelectRegionRef.current = onSelectRegion;
  }, [onSelectRegion]);

  useEffect(() => {
    skipSelectionSyncRef.current = true;
    collapseTimeSelection(controlsRef.current.setSelection);
  }, [regionsLayoutKey]);

  useEffect(() => {
    if (selectedRegionId !== null) {
      return;
    }

    skipSelectionSyncRef.current = true;
    collapseTimeSelection(controlsRef.current.setSelection);
  }, [selectedRegionId]);

  useEffect(() => {
    if (skipSelectionSyncRef.current) {
      skipSelectionSyncRef.current = false;
      return;
    }

    if (!tracks.length || sampleRate <= 0) {
      return;
    }

    const match = resolveRegionFromTimelineSelection(
      tracks,
      sampleRate,
      selectionStart,
      selectionEnd,
      playlistTrackId,
    );

    if (!match) {
      return;
    }

    const editorState = useAudioEditorStore.getState();
    const regionChanged = match.regionId !== editorState.selectedRegionId;

    if (regionChanged) {
      onSelectRegionRef.current(match.regionId);
      selectTrackFromTimeline(match.trackId);
      return;
    }

    const isCollapsedSelection = !isTimelineRangeSelection(selectionStart, selectionEnd);

    if (
      isCollapsedSelection &&
      editorState.trackSelectionSource === "timeline" &&
      editorState.selectedTrackId &&
      match.trackId !== editorState.selectedTrackId
    ) {
      return;
    }

    if (editorState.trackSelectionSource !== "timeline") {
      return;
    }

    if (match.trackId !== editorState.selectedTrackId) {
      selectTrackFromTimeline(match.trackId);
    }
  }, [
    playlistTrackId,
    sampleRate,
    selectedRegionId,
    selectionEnd,
    selectionStart,
    selectTrackFromTimeline,
    tracks,
  ]);

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

      const playlistTrack = resolvePlaylistTrackForEditorTrack(
        tracksRef.current,
        parsed.trackId,
      );

      if (playlistTrack) {
        controlsRef.current.setSelectedTrackId(playlistTrack.id);
      }

      skipSelectionSyncRef.current = true;
      onSelectRegionRef.current(parsed.regionId);
      selectTrackFromTimeline(parsed.trackId);
    }

    container.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [containerRef, selectTrackFromTimeline]);

  return null;
}
