"use client";

import type { EditOperation, EditorTrackId } from "@ai-music/shared";
import { useCallback } from "react";
import { useApi } from "@/shared/providers/api-provider";
import {
  selectSelectedRegion,
  useAudioEditorStore,
} from "@/features/music-editor/store/audio-editor-store";

function buildSelectionPayload() {
  const state = useAudioEditorStore.getState();

  return {
    selectedRegionId: state.selectedRegionId,
    selectedTrackId: state.selectedTrackId,
  };
}

export function useEditorOperations() {
  const api = useApi();
  const songId = useAudioEditorStore((state) => state.songId);
  const selectedRegionId = useAudioEditorStore((state) => state.selectedRegionId);
  const selectedTrackId = useAudioEditorStore((state) => state.selectedTrackId);
  const hydrate = useAudioEditorStore((state) => state.hydrate);
  const setBusy = useAudioEditorStore((state) => state.setBusy);
  const setError = useAudioEditorStore((state) => state.setError);

  const applyOperation = useCallback(
    async (operation: EditOperation) => {
      if (!songId) {
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const result = await api.musicEditor.applyOperation(songId, {
          operation,
          ...buildSelectionPayload(),
        });
        hydrate(result);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Operation failed");
      } finally {
        setBusy(false);
      }
    },
    [api, hydrate, setBusy, setError, songId],
  );

  const undo = useCallback(async () => {
    if (!songId) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await api.musicEditor.undoLastOperation(songId);
      hydrate(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Undo failed");
    } finally {
      setBusy(false);
    }
  }, [api, hydrate, setBusy, setError, songId]);

  const redo = useCallback(async () => {
    if (!songId) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await api.musicEditor.redoLastOperation(songId);
      hydrate(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Redo failed");
    } finally {
      setBusy(false);
    }
  }, [api, hydrate, setBusy, setError, songId]);

  const setVolume = useCallback(
    (trackId: EditorTrackId, gainDb: number) => {
      if (!selectedRegionId) {
        setError("Выберите регион на timeline");
        return;
      }

      void applyOperation({
        type: "SET_VOLUME",
        trackId,
        regionId: selectedRegionId,
        gainDb,
      });
    },
    [applyOperation, selectedRegionId, setError],
  );

  const muteTrack = useCallback(
    (trackId: EditorTrackId, muted: boolean) => {
      if (!selectedRegionId) {
        setError("Выберите регион на timeline");
        return;
      }

      void applyOperation({
        type: "MUTE_TRACK",
        trackId,
        regionId: selectedRegionId,
        muted,
      });
    },
    [applyOperation, selectedRegionId, setError],
  );

  const splitRegion = useCallback(() => {
    const region = selectSelectedRegion(useAudioEditorStore.getState());

    if (!region) {
      setError("Выберите регион для split");
      return;
    }

    const splitAtMs = Math.round((region.startMs + region.endMs) / 2);

    void applyOperation({
      type: "SPLIT_REGION",
      regionId: region.id,
      splitAtMs,
    });
  }, [applyOperation, setError]);

  const duplicateRegion = useCallback(() => {
    if (!selectedRegionId) {
      setError("Выберите регион для duplicate");
      return;
    }

    void applyOperation({
      type: "DUPLICATE_REGION",
      regionId: selectedRegionId,
    });
  }, [applyOperation, selectedRegionId, setError]);

  const resizeRegion = useCallback(
    (regionId: string, startMs: number, endMs: number) => {
      void applyOperation({
        type: "RESIZE_REGION",
        regionId,
        startMs,
        endMs,
      });
    },
    [applyOperation],
  );

  const fadeRegion = useCallback(
    (fadeType: "in" | "out") => {
      if (!selectedRegionId || !selectedTrackId) {
        setError("Выберите регион и дорожку");
        return;
      }

      void applyOperation({
        type: "FADE",
        trackId: selectedTrackId,
        regionId: selectedRegionId,
        fadeType,
        durationMs: 800,
      });
    },
    [applyOperation, selectedRegionId, selectedTrackId, setError],
  );

  const moveRegion = useCallback(
    (direction: "left" | "right") => {
      const state = useAudioEditorStore.getState();
      const region = selectSelectedRegion(state);

      if (!region) {
        setError("Выберите регион для move");
        return;
      }

      const targetIndex =
        direction === "left"
          ? Math.max(0, region.orderIndex - 1)
          : region.orderIndex + 1;

      void applyOperation({
        type: "MOVE_REGION",
        regionId: region.id,
        targetIndex,
      });
    },
    [applyOperation, setError],
  );

  const cutRegion = useCallback(() => {
    if (!selectedRegionId) {
      setError("Выберите регион для cut");
      return;
    }

    void applyOperation({
      type: "CUT_REGION",
      regionId: selectedRegionId,
    });
  }, [applyOperation, selectedRegionId, setError]);

  return {
    applyOperation,
    undo,
    redo,
    setVolume,
    muteTrack,
    splitRegion,
    duplicateRegion,
    resizeRegion,
    fadeRegion,
    moveRegion,
    cutRegion,
  };
}
