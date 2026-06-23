"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import { useEffect, useState } from "react";
import {
  getCachedEditorState,
  isEditorStemsReady,
  setCachedEditorState,
} from "@/features/music-editor/utils/editor-session-cache";
import { shouldInvalidateCreditsAfterEditorStateChange } from "@/features/billing/lib/should-invalidate-credits-after-editor-state";
import { useInvalidateCreditsBalance } from "@/features/billing/hooks/invalidate-credits-balance";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { useApi } from "@/shared/providers/api-provider";

export function useEditorInitialLoad(songId: string) {
  const api = useApi();
  const invalidateCreditsBalance = useInvalidateCreditsBalance();
  const hydrate = useAudioEditorStore((state) => state.hydrate);
  const setBusy = useAudioEditorStore((state) => state.setBusy);
  const setError = useAudioEditorStore((state) => state.setError);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    const cachedState = getCachedEditorState(songId);

    if (cachedState) {
      hydrate(cachedState);
      setTitle(cachedState.song.title);
    }

    void Promise.resolve().then(async () => {
      if (cancelled) {
        return;
      }

      setBusy(!cachedState);
      setError(null);

      const previous = {
        songStatus: cachedState?.song.status ?? null,
      };

      try {
        const state = await api.musicEditor.getEditorState(songId);

        if (cancelled) {
          return;
        }

        const next = {
          songStatus: state.song.status,
        };

        if (shouldInvalidateCreditsAfterEditorStateChange(previous, next)) {
          void invalidateCreditsBalance();
        }

        hydrate(state);
        setTitle(state.song.title);

        if (isEditorStemsReady(state)) {
          setCachedEditorState(songId, state);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(parseApiError(loadError, "Editor error"));
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [api, hydrate, invalidateCreditsBalance, setBusy, setError, songId]);

  return { title };
}
