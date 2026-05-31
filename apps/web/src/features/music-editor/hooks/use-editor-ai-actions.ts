"use client";

import { useCallback } from "react";
import { useApi } from "@/shared/providers/api-provider";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";

export function useEditorAiActions() {
  const api = useApi();
  const songId = useAudioEditorStore((state) => state.songId);
  const selectedRegionId = useAudioEditorStore((state) => state.selectedRegionId);
  const hydrate = useAudioEditorStore((state) => state.hydrate);
  const setBusy = useAudioEditorStore((state) => state.setBusy);
  const setError = useAudioEditorStore((state) => state.setError);

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
    voiceTransfer,
  };
}
