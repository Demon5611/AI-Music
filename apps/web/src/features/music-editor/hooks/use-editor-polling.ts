"use client";

import { useCallback, useEffect } from "react";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { useApi } from "@/shared/providers/api-provider";

const POLL_INTERVAL_MS = 5000;

export function useEditorPolling(songId: string) {
  const api = useApi();
  const hydrate = useAudioEditorStore((store) => store.hydrate);
  const setError = useAudioEditorStore((store) => store.setError);
  const songStatus = useAudioEditorStore((store) => store.songStatus);
  const pendingAction = useAudioEditorStore((store) => store.pendingAction);

  const isProcessing =
    songStatus === "separating_stems" || pendingAction?.status === "processing";

  const refresh = useCallback(async () => {
    try {
      const state = await api.musicEditor.getEditorState(songId);
      hydrate(state);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Refresh failed");
    }
  }, [api, hydrate, setError, songId]);

  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    void refresh();

    const timer = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isProcessing, refresh]);

  return { refresh, isProcessing };
}
