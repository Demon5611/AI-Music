"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipTrack } from "@waveform-playlist/core";
import type { EditOperation, EditorTrackId, SongRegionDto } from "@ai-music/shared";
import {
  AUDIO_CONTEXT_OPTIONS,
  buildRegionTrack,
  type RegionMixPreviewOverlay,
  type TimelineStemSource,
} from "@/features/music-editor/utils/waveform-playlist-utils";

function buildSourcesKey(sources: TimelineStemSource[]): string {
  return sources.map((source) => `${source.id}:${source.url}`).join("|");
}

function buildBufferCacheKey(sourceId: EditorTrackId, url: string): string {
  return `${sourceId}::${url}`;
}

const stemBufferCache = new Map<string, AudioBuffer>();

function readCachedBuffers(
  sources: TimelineStemSource[],
): Map<EditorTrackId, AudioBuffer> {
  const cached = new Map<EditorTrackId, AudioBuffer>();

  for (const source of sources) {
    const buffer = stemBufferCache.get(buildBufferCacheKey(source.id, source.url));

    if (buffer) {
      cached.set(source.id, buffer);
    }
  }

  return cached;
}

function useStemAudioBuffers(sources: TimelineStemSource[]): {
  buffersBySourceId: Map<EditorTrackId, AudioBuffer>;
  isLoading: boolean;
  error: string | null;
  ready: boolean;
} {
  const sourcesKey = buildSourcesKey(sources);
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const initialCachedBuffers = readCachedBuffers(sources);
  const [buffersBySourceId, setBuffersBySourceId] = useState<
    Map<EditorTrackId, AudioBuffer>
  >(initialCachedBuffers);
  const [isLoading, setIsLoading] = useState(
    sources.length > 0 && initialCachedBuffers.size !== sources.length,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentSources = sourcesRef.current;

    if (currentSources.length === 0) {
      setBuffersBySourceId(new Map());
      setIsLoading(false);
      setError(null);
      return;
    }

    const cachedBuffers = readCachedBuffers(currentSources);

    if (cachedBuffers.size === currentSources.length) {
      setBuffersBySourceId(cachedBuffers);
      setIsLoading(false);
      setError(null);
      return;
    }

    setBuffersBySourceId((current) =>
      cachedBuffers.size > 0 ? cachedBuffers : current,
    );
    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();
    const audioContext = new window.AudioContext(AUDIO_CONTEXT_OPTIONS);

    async function loadBuffers(): Promise<void> {
      try {
        const entries = await Promise.all(
          currentSources.map(async (source) => {
            const cacheKey = buildBufferCacheKey(source.id, source.url);
            const cachedBuffer = stemBufferCache.get(cacheKey);

            if (cachedBuffer) {
              return [source.id, cachedBuffer] as const;
            }

            const response = await fetch(source.url, {
              signal: abortController.signal,
            });

            if (!response.ok) {
              throw new Error(`Audio request failed: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            stemBufferCache.set(cacheKey, audioBuffer);

            return [source.id, audioBuffer] as const;
          }),
        );

        setBuffersBySourceId(new Map(entries));
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Audio load failed");
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
  }, [sourcesKey]);

  const ready =
    !isLoading &&
    sources.length > 0 &&
    buffersBySourceId.size === sources.length;

  return { buffersBySourceId, isLoading, error, ready };
}

function buildMixPreviewSignature(mixPreview?: RegionMixPreviewOverlay): string {
  if (!mixPreview?.selectedRegionId) {
    return "";
  }

  return (["vocal", "instrumental"] as const)
    .map((trackId) => {
      const state = mixPreview.previewTracks[trackId];

      return [trackId, state.muted, state.solo].join(":");
    })
    .join("|");
}

export function useRegionPlaylistTracks(
  sources: TimelineStemSource[],
  regions: SongRegionDto[],
  operations: EditOperation[],
  mixPreview?: RegionMixPreviewOverlay,
): {
  tracks: ClipTrack[];
  isLoading: boolean;
  error: string | null;
} {
  const { buffersBySourceId, isLoading, error, ready } =
    useStemAudioBuffers(sources);
  const lastStableTracksRef = useRef<ClipTrack[]>([]);
  const mixPreviewSignature = buildMixPreviewSignature(mixPreview);

  const tracks = useMemo(() => {
    if (regions.length === 0) {
      lastStableTracksRef.current = [];
      return [];
    }

    if (!ready) {
      return lastStableTracksRef.current;
    }

    const nextTracks = sources
      .map((source) => {
        const audioBuffer = buffersBySourceId.get(source.id);

        if (!audioBuffer) {
          return null;
        }

        return buildRegionTrack(source, audioBuffer, regions, operations, mixPreview);
      })
      .filter((track): track is ClipTrack => track !== null);

    lastStableTracksRef.current = nextTracks;
    return nextTracks;
  }, [buffersBySourceId, mixPreview, mixPreviewSignature, operations, ready, regions, sources]);

  return {
    tracks,
    isLoading: isLoading && lastStableTracksRef.current.length === 0,
    error,
  };
}
