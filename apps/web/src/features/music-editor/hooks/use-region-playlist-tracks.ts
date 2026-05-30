"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClipTrack } from "@waveform-playlist/core";
import type { EditOperation, EditorTrackId, SongRegionDto } from "@ai-music/shared";
import {
  AUDIO_CONTEXT_OPTIONS,
  buildRegionTrack,
  type TimelineStemSource,
} from "@/features/music-editor/utils/waveform-playlist-utils";

function buildSourcesKey(sources: TimelineStemSource[]): string {
  return sources.map((source) => `${source.id}:${source.url}`).join("|");
}

function useStemAudioBuffers(sources: TimelineStemSource[]): {
  buffersBySourceId: Map<EditorTrackId, AudioBuffer>;
  isLoading: boolean;
  error: string | null;
  ready: boolean;
} {
  const sourcesKey = buildSourcesKey(sources);
  const [buffersBySourceId, setBuffersBySourceId] = useState<
    Map<EditorTrackId, AudioBuffer>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sources.length === 0) {
      setBuffersBySourceId(new Map());
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();
    const audioContext = new window.AudioContext(AUDIO_CONTEXT_OPTIONS);

    async function loadBuffers(): Promise<void> {
      try {
        const entries = await Promise.all(
          sources.map(async (source) => {
            const response = await fetch(source.url, {
              signal: abortController.signal,
            });

            if (!response.ok) {
              throw new Error(`Audio request failed: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            return [source.id, audioBuffer] as const;
          }),
        );

        setBuffersBySourceId(new Map(entries));
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Audio load failed");
        setBuffersBySourceId(new Map());
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadBuffers();

    return () => {
      abortController.abort();
      void audioContext.close();
    };
  }, [sources, sourcesKey]);

  const ready =
    !isLoading &&
    sources.length > 0 &&
    buffersBySourceId.size === sources.length;

  return { buffersBySourceId, isLoading, error, ready };
}

export function useRegionPlaylistTracks(
  sources: TimelineStemSource[],
  regions: SongRegionDto[],
  operations: EditOperation[],
): {
  tracks: ClipTrack[];
  isLoading: boolean;
  error: string | null;
} {
  const { buffersBySourceId, isLoading, error, ready } =
    useStemAudioBuffers(sources);

  const tracks = useMemo(() => {
    if (!ready || regions.length === 0) {
      return [];
    }

    return sources.map((source) => {
      const audioBuffer = buffersBySourceId.get(source.id);

      if (!audioBuffer) {
        return null;
      }

      return buildRegionTrack(source, audioBuffer, regions, operations);
    }).filter((track): track is ClipTrack => track !== null);
  }, [buffersBySourceId, operations, ready, regions, sources]);

  return {
    tracks,
    isLoading: isLoading || (sources.length > 0 && regions.length > 0 && !ready),
    error,
  };
}
