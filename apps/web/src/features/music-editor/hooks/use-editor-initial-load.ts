"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import { useEffect, useState } from "react";
import {
  getCachedEditorState,
  isEditorStemsReady,
  setCachedEditorState,
} from "@/features/music-editor/utils/editor-session-cache";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { useApi } from "@/shared/providers/api-provider";

export function useEditorInitialLoad(songId: string) {
  const api = useApi();
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

      try {
        const state = await api.musicEditor.getEditorState(songId);

        if (cancelled) {
          return;
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
  }, [api, hydrate, setBusy, setError, songId]);

  return { title };
}
