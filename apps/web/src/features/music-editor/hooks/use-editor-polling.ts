"use client";

import { useCallback, useEffect } from "react";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { shouldInvalidateCreditsAfterEditorStateChange } from "@/features/billing/lib/should-invalidate-credits-after-editor-state";
import { useInvalidateCreditsBalance } from "@/features/billing/hooks/invalidate-credits-balance";
import { useApi } from "@/shared/providers/api-provider";

const POLL_INTERVAL_MS = 5000;

export function useEditorPolling(songId: string) {
  const api = useApi();
  const invalidateCreditsBalance = useInvalidateCreditsBalance();
  const hydrate = useAudioEditorStore((store) => store.hydrate);
  const setError = useAudioEditorStore((store) => store.setError);
  const songStatus = useAudioEditorStore((store) => store.songStatus);
  const isProcessing =
    songStatus === "separating_stems" || songStatus === "pending_stems";

  const refresh = useCallback(async () => {
    const previous = {
      songStatus: useAudioEditorStore.getState().songStatus,
      pendingAction: useAudioEditorStore.getState().songPendingAction,
    };

    try {
      const state = await api.musicEditor.getEditorState(songId);
      const next = {
        songStatus: state.song.status,
        pendingAction: state.song.pendingAction ?? null,
      };

      if (shouldInvalidateCreditsAfterEditorStateChange(previous, next)) {
        void invalidateCreditsBalance();
      }

      hydrate(state);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Refresh failed");
    }
  }, [api, hydrate, invalidateCreditsBalance, setError, songId]);

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
