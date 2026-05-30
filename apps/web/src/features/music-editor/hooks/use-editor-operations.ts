"use client";

import type { EditOperation, EditorTrackId } from "@ai-music/shared";
import {
  findRegionAtLayoutMs,
  isTimelineRangeSelection,
  resolveDeleteRangeForEditor,
  resolveDeleteRangeFromLayoutSelection,
  resolveSplitAtMsForEditor,
} from "@ai-music/shared";
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
    const state = useAudioEditorStore.getState();
    let region = selectSelectedRegion(state);

    if (!region) {
      const layoutMatch = findRegionAtLayoutMs(
        state.regions,
        state.operations,
        state.currentTimeMs,
      );

      if (!layoutMatch) {
        setError("Поставьте playhead внутри региона или выберите фрагмент на timeline");
        return;
      }

      region =
        state.regions.find((item) => item.id === layoutMatch.regionId) ?? null;

      if (!region) {
        setError("Не удалось определить регион для split");
        return;
      }
    }

    const splitResult = resolveSplitAtMsForEditor(
      state.regions,
      state.operations,
      region,
      state.currentTimeMs,
    );

    if ("error" in splitResult) {
      setError(
        splitResult.error === "Playhead must be inside the selected region on the timeline"
          ? "Поставьте playhead внутри выбранного региона на timeline"
          : splitResult.error === "Playhead is too close to the region edge for split"
            ? "Playhead слишком близко к краю региона для split"
            : splitResult.error === "Region is too short for split"
              ? "Регион слишком короткий для split"
              : "Не удалось выполнить split в позиции playhead",
      );
      return;
    }

    void applyOperation({
      type: "SPLIT_REGION",
      regionId: region.id,
      splitAtMs: splitResult.splitAtMs,
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

  const resizeTrackRegion = useCallback(
    (
      trackId: EditorTrackId,
      regionId: string,
      startMs: number,
      endMs: number,
    ) => {
      void applyOperation({
        type: "RESIZE_TRACK_REGION",
        trackId,
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

  const moveRegionToIndex = useCallback(
    (regionId: string, targetIndex: number) => {
      void applyOperation({
        type: "MOVE_REGION",
        regionId,
        targetIndex,
      });
    },
    [applyOperation],
  );

  const moveTrackRegionToIndex = useCallback(
    (trackId: EditorTrackId, regionId: string, targetIndex: number) => {
      void applyOperation({
        type: "MOVE_TRACK_REGION",
        trackId,
        regionId,
        targetIndex,
      });
    },
    [applyOperation],
  );

  const deleteRegion = useCallback(() => {
    const state = useAudioEditorStore.getState();
    const selection = state.timelineSelectionSec;
    const selectionContext = state.timelineSelectionContext;
    const hasRangeSelection =
      selection !== null &&
      isTimelineRangeSelection(selection.startSec, selection.endSec);

    let region = selectSelectedRegion(state);

    if (hasRangeSelection && selectionContext?.regionId) {
      region =
        state.regions.find((item) => item.id === selectionContext.regionId) ??
        region;
    }

    if (!region) {
      setError("Выберите region для удаления");
      return;
    }

    if (!hasRangeSelection) {
      void applyOperation({
        type: "DELETE_REGION",
        regionId: region.id,
      });
      return;
    }

    const hasClipLayout =
      selectionContext !== null &&
      selectionContext.regionId === region.id &&
      selectionContext.layoutEndSec > selectionContext.layoutStartSec;

    const rangeResult = hasClipLayout
      ? resolveDeleteRangeFromLayoutSelection(
          region,
          selectionContext.layoutStartSec * 1000,
          selectionContext.layoutEndSec * 1000,
          selection.startSec * 1000,
          selection.endSec * 1000,
        )
      : resolveDeleteRangeForEditor(
          state.regions,
          state.operations,
          region,
          selection.startSec * 1000,
          selection.endSec * 1000,
        );

    if ("error" in rangeResult) {
      setError(
        rangeResult.error === "Selection is too short or outside the region"
          ? "Выделите фрагмент внутри выбранного region на timeline"
          : rangeResult.error === "Selected range is too short to delete"
            ? "Выделенный фрагмент слишком короткий для удаления"
            : rangeResult.error === "Selection is too close to the region edge"
              ? "Выделение слишком близко к краю region — удалится весь блок или используйте Split"
              : "Не удалось определить диапазон для удаления",
      );
      return;
    }

    if (rangeResult.fullRegion) {
      void applyOperation({
        type: "DELETE_REGION",
        regionId: region.id,
      });
      return;
    }

    void applyOperation({
      type: "DELETE_RANGE",
      regionId: region.id,
      startMs: rangeResult.startMs,
      endMs: rangeResult.endMs,
    });
  }, [applyOperation, setError]);

  return {
    applyOperation,
    undo,
    redo,
    setVolume,
    muteTrack,
    splitRegion,
    duplicateRegion,
    resizeRegion,
    resizeTrackRegion,
    fadeRegion,
    moveRegion,
    moveRegionToIndex,
    moveTrackRegionToIndex,
    deleteRegion,
  };
}
