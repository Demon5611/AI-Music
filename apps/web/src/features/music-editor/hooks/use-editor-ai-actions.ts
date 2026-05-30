"use client";

import { useCallback, useState } from "react";
import { useApi } from "@/shared/providers/api-provider";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";

export function useEditorAiActions() {
  const api = useApi();
  const songId = useAudioEditorStore((state) => state.songId);
  const selectedRegionId = useAudioEditorStore((state) => state.selectedRegionId);
  const selectedTrackId = useAudioEditorStore((state) => state.selectedTrackId);
  const currentTimeMs = useAudioEditorStore((state) => state.currentTimeMs);
  const hydrate = useAudioEditorStore((state) => state.hydrate);
  const setBusy = useAudioEditorStore((state) => state.setBusy);
  const setError = useAudioEditorStore((state) => state.setError);
  const setAiCommandPreview = useAudioEditorStore((state) => state.setAiCommandPreview);
  const setAiCommandText = useAudioEditorStore((state) => state.setAiCommandText);
  const aiCommandPreview = useAudioEditorStore((state) => state.aiCommandPreview);
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);

  const previewAiCommand = useCallback(
    async (prompt: string) => {
      if (!songId) {
        return;
      }

      if (!selectedRegionId) {
        setError("Выберите регион на timeline");
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const result = await api.musicEditor.aiCommand(songId, {
          prompt,
          selectedRegionId,
          selectedTrackId,
          playheadLayoutMs: currentTimeMs,
          apply: false,
        });

        setLastExplanation(result.command.explanation);
        setAiCommandPreview(result.command.operation);
      } catch (error) {
        setError(error instanceof Error ? error.message : "AI command failed");
      } finally {
        setBusy(false);
      }
    },
    [
      api,
      selectedRegionId,
      selectedTrackId,
      currentTimeMs,
      setAiCommandPreview,
      setBusy,
      setError,
      songId,
    ],
  );

  const confirmAiCommand = useCallback(async () => {
    if (!songId || !aiCommandPreview) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await api.musicEditor.applyOperation(songId, {
        operation: aiCommandPreview,
        selectedRegionId,
        selectedTrackId,
      });

      hydrate(result);
      setAiCommandPreview(null);
      setAiCommandText("");
      setLastExplanation(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Apply operation failed");
    } finally {
      setBusy(false);
    }
  }, [
    aiCommandPreview,
    api,
    hydrate,
    selectedRegionId,
    selectedTrackId,
    setAiCommandPreview,
    setAiCommandText,
    setBusy,
    setError,
    songId,
  ]);

  const cancelAiPreview = useCallback(() => {
    setAiCommandPreview(null);
    setLastExplanation(null);
  }, [setAiCommandPreview]);

  const extendSong = useCallback(
    async (prompt?: string) => {
      if (!songId || !selectedRegionId) {
        setError("Выберите регион для extend");
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const state = await api.musicEditor.extend(songId, {
          regionId: selectedRegionId,
          prompt,
        });
        hydrate(state);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Extend failed");
      } finally {
        setBusy(false);
      }
    },
    [api, hydrate, selectedRegionId, setBusy, setError, songId],
  );

  const regenerateRegion = useCallback(
    async (prompt: string) => {
      if (!songId || !selectedRegionId) {
        setError("Выберите регион для regenerate");
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const state = await api.musicEditor.regenerateRegion(songId, {
          regionId: selectedRegionId,
          prompt,
        });
        hydrate(state);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Regenerate failed");
      } finally {
        setBusy(false);
      }
    },
    [api, hydrate, selectedRegionId, setBusy, setError, songId],
  );

  const voiceTransfer = useCallback(
    async (voiceModelId: number) => {
      if (!songId || !selectedRegionId) {
        setError("Выберите регион для voice transfer");
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const state = await api.musicEditor.voiceTransfer(songId, {
          regionId: selectedRegionId,
          voiceModelId,
        });
        hydrate(state);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Voice transfer failed");
      } finally {
        setBusy(false);
      }
    },
    [api, hydrate, selectedRegionId, setBusy, setError, songId],
  );

  return {
    lastExplanation,
    previewAiCommand,
    confirmAiCommand,
    cancelAiPreview,
    extendSong,
    regenerateRegion,
    voiceTransfer,
  };
}
