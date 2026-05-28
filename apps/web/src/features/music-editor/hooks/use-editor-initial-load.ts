"use client";

import { ApiError } from "@ai-music/api-client";
import { useEffect, useState } from "react";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { useApi } from "@/shared/providers/api-provider";

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === "object") {
    const body = error.body as { error?: string };
    if (body.error) return body.error;
  }
  if (error instanceof Error) return error.message;
  return "Editor error";
}

export function useEditorInitialLoad(songId: string) {
  const api = useApi();
  const hydrate = useAudioEditorStore((state) => state.hydrate);
  const setBusy = useAudioEditorStore((state) => state.setBusy);
  const setError = useAudioEditorStore((state) => state.setError);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;

      setBusy(true);
      setError(null);

      try {
        let state = await api.musicEditor.getEditorState(songId);
        if (state.song.status !== "ready") {
          await api.musicEditor.separateStems(songId);
          state = await api.musicEditor.getEditorState(songId);
        }
        if (cancelled) return;
        hydrate(state);
        setTitle(state.song.title);
      } catch (loadError) {
        if (!cancelled) setError(resolveErrorMessage(loadError));
      } finally {
        if (!cancelled) setBusy(false);
      }
    });

    return () => { cancelled = true; };
  }, [api, hydrate, setBusy, setError, songId]);

  return { title };
}