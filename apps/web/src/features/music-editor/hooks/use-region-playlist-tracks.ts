"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipTrack } from "@waveform-playlist/core";
import type { EditOperation, EditorTrackId, SongRegionDto } from "@ai-music/shared";
import {
  AUDIO_CONTEXT_OPTIONS,
  buildRegionTrack,
  type RegionMixPreviewOverlay,
  type TimelineStemSource,
} from "@/features/music-editor/utils/waveform-playlist-utils";
import { createDevAuthToken, env } from "@/shared/config/env";
import { needsAuthenticatedAudioFetch } from "@/shared/lib/needs-authenticated-audio-fetch";

function buildSourcesKey(sources: TimelineStemSource[]): string {
  return sources.map((source) => `${source.id}:${source.url}`).join("|");
}

function buildBufferCacheKey(sourceId: EditorTrackId, url: string): string {
  return `${sourceId}::${url}`;
}

const stemBufferCache = new Map<string, AudioBuffer>();
const replacementBufferCache = new Map<string, AudioBuffer>();

function buildReplacementSourcesKey(regions: SongRegionDto[]): string {
  return regions
    .filter((region) => region.replacementAudioUrl)
    .map((region) => `${region.id}:${region.replacementAudioUrl}`)
    .join("|");
}

async function buildAuthenticatedAudioHeaders(
  url: string,
  getToken: () => Promise<string | null>,
): Promise<HeadersInit> {
  if (!needsAuthenticatedAudioFetch(url)) {
    return {};
  }

  const token = env.isClerkEnabled ? await getToken() : createDevAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

function useReplacementAudioBuffers(regions: SongRegionDto[]): {
  buffersByRegionId: Map<string, AudioBuffer>;
  isLoading: boolean;
  error: string | null;
  ready: boolean;
} {
  const { getToken } = useAuth();
  const sourcesKey = buildReplacementSourcesKey(regions);
  const replacementRegions = useMemo(
    () => regions.filter((region) => region.replacementAudioUrl),
    [regions],
  );
  const [buffersByRegionId, setBuffersByRegionId] = useState<Map<string, AudioBuffer>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(replacementRegions.length > 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (replacementRegions.length === 0) {
      setBuffersByRegionId(new Map());
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
          replacementRegions.map(async (region) => {
            const cacheKey = `${region.id}::${region.replacementAudioUrl}`;
            const cachedBuffer = replacementBufferCache.get(cacheKey);

            if (cachedBuffer) {
              return [region.id, cachedBuffer] as const;
            }

            const response = await fetch(region.replacementAudioUrl!, {
              signal: abortController.signal,
              headers: await buildAuthenticatedAudioHeaders(region.replacementAudioUrl!, getToken),
            });

            if (!response.ok) {
              throw new Error(`Replacement audio request failed: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            replacementBufferCache.set(cacheKey, audioBuffer);

            return [region.id, audioBuffer] as const;
          }),
        );

        setBuffersByRegionId(new Map(entries));
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Replacement audio load failed");
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
  }, [getToken, sourcesKey, replacementRegions]);

  const ready =
    !isLoading &&
    (replacementRegions.length === 0 || buffersByRegionId.size === replacementRegions.length);

  return { buffersByRegionId, isLoading, error, ready };
}

function buildMixPreviewSignature(mixPreview?: RegionMixPreviewOverlay): string {
  if (!mixPreview?.selectedRegionId) {
    return "";
  }

  return [
    mixPreview.selectedRegionId,
    (["vocal", "instrumental"] as const)
      .map((trackId) => {
        const state = mixPreview.previewTracks[trackId];

        return [trackId, state.gainDb, state.muted, state.solo].join(":");
      })
      .join("|"),
  ].join("::");
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
  const {
    buffersByRegionId,
    isLoading: isReplacementLoading,
    error: replacementError,
    ready: replacementsReady,
  } = useReplacementAudioBuffers(regions);
  const lastStableTracksRef = useRef<ClipTrack[]>([]);
  const mixPreviewSignature = buildMixPreviewSignature(mixPreview);

  const tracks = useMemo(() => {
    if (regions.length === 0) {
      lastStableTracksRef.current = [];
      return [];
    }

    if (!ready || !replacementsReady) {
      return lastStableTracksRef.current;
    }

    const nextTracks = sources
      .map((source) => {
        const audioBuffer = buffersBySourceId.get(source.id);

        if (!audioBuffer) {
          return null;
        }

        return buildRegionTrack(
          source,
          audioBuffer,
          regions,
          operations,
          mixPreview,
          buffersByRegionId,
        );
      })
      .filter((track): track is ClipTrack => track !== null);

    lastStableTracksRef.current = nextTracks;
    return nextTracks;
  }, [
    buffersByRegionId,
    buffersBySourceId,
    mixPreviewSignature,
    operations,
    ready,
    regions,
    replacementsReady,
    sources,
  ]);

  return {
    tracks,
    isLoading: (isLoading || isReplacementLoading) && lastStableTracksRef.current.length === 0,
    error: error ?? replacementError,
  };
}
