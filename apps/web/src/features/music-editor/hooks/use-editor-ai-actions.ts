"use client";

import { useCallback, useState } from "react";
import { useApi } from "@/shared/providers/api-provider";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";

export function useEditorAiActions() {
  const api = useApi();
  const songId = useAudioEditorStore((state) => state.songId);
  const selectedRegionId = useAudioEditorStore((state) => state.selectedRegionId);
  const selectedTrackId = useAudioEditorStore((state) => state.selectedTrackId);
  const hydrate = useAudioEditorStore((state) => state.hydrate);
  const setBusy = useAudioEditorStore((state) => state.setBusy);
  const setError = useAudioEditorStore((state) => state.setError);
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);

  const runAiCommand = useCallback(
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
          apply: true,
        });

        setLastExplanation(result.command.explanation);

        if (result.editorState) {
          hydrate(result.editorState);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "AI command failed");
      } finally {
        setBusy(false);
      }
    },
    [
      api,
      hydrate,
      selectedRegionId,
      selectedTrackId,
      setBusy,
      setError,
      songId,
    ],
  );

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
    runAiCommand,
    extendSong,
    regenerateRegion,
    voiceTransfer,
  };
}
