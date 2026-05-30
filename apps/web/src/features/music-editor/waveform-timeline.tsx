"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipInteractionProvider,
  Waveform,
  WaveformPlaylistProvider,
  usePlaybackAnimation,
  usePlaylistControls,
  usePlaylistData,
} from "@waveform-playlist/browser";
import type { ClipTrack } from "@waveform-playlist/core";
import type { EditOperation, EditorTrackId, SongRegionDto } from "@ai-music/shared";
import { PlaylistRegionBridge } from "@/features/music-editor/playlist-region-bridge";
import { Tooltip } from "@/shared/ui/tooltip";
import { TransportControls } from "@/features/music-editor/transport-controls";
import {
  useAudioEditorStore,
  type PlaybackController,
} from "@/features/music-editor/store/audio-editor-store";
import { seekTimeline } from "@/features/music-editor/utils/timeline-sync";
import {
  AUDIO_CONTEXT_OPTIONS,
  buildRegionTrack,
  computeTimelineLayoutDurationSec,
  dbToGain,
  mirrorRegionClipEdits,
  resolveTimelineOperation,
  resolveTimelineZoomSettings,
  FIT_ZOOM_BASE,
  TRACK_WAVE_HEIGHT,
  type PendingTimelineOperation,
  type TimelineStemSource,
} from "@/features/music-editor/utils/waveform-playlist-utils";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface WaveformTimelineProps {
  regions: SongRegionDto[];
  operations: EditOperation[];
  selectedRegionId: string | null;
  vocalPlaybackUrl: string | null;
  instrumentalPlaybackUrl: string | null;
  onSelectRegion: (regionId: string) => void;
  onResizeRegion: (regionId: string, startMs: number, endMs: number) => void;
  onMoveRegion: (regionId: string, targetIndex: number) => void;
  onResizeTrackRegion: (
    trackId: EditorTrackId,
    regionId: string,
    startMs: number,
    endMs: number,
  ) => void;
  onMoveTrackRegion: (
    trackId: EditorTrackId,
    regionId: string,
    targetIndex: number,
  ) => void;
  disabled?: boolean;
}

const TRACK_COLORS: Record<EditorTrackId, string> = {
  vocal: "#93c5fd",
  instrumental: "#86efac",
};

const PERSIST_DEBOUNCE_MS = 450;

function useRegionPlaylistTracks(
  sources: TimelineStemSource[],
  regions: SongRegionDto[],
  operations: EditOperation[],
): {
  tracks: ClipTrack[];
  isLoading: boolean;
  error: string | null;
} {
  const [tracks, setTracks] = useState<ClipTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sources.length === 0 || regions.length === 0) {
      setTracks([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setTracks([]);
    setIsLoading(true);
    setError(null);

    const abortController = new AbortController();
    const audioContext = new window.AudioContext(AUDIO_CONTEXT_OPTIONS);

    async function loadTracks(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const nextTracks = await Promise.all(
          sources.map(async (source) => {
            const response = await fetch(source.url, {
              signal: abortController.signal,
            });

            if (!response.ok) {
              throw new Error(`Audio request failed: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            return buildRegionTrack(source, audioBuffer, regions, operations);
          }),
        );

        setTracks(nextTracks);
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Audio load failed");
        setTracks([]);
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadTracks();

    return () => {
      abortController.abort();
      void audioContext.close();
    };
  }, [operations, regions, sources]);

  return { tracks, isLoading, error };
}

function PlaylistTimelineZoomBridge({ providerKey }: { providerKey: string }) {
  const controls = usePlaylistControls();
  const { isReady } = usePlaylistData();
  const zoom = useAudioEditorStore((state) => state.zoom);
  const lastProviderKeyRef = useRef(providerKey);
  const lastAppliedZoomRef = useRef(FIT_ZOOM_BASE);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (lastProviderKeyRef.current !== providerKey) {
      lastProviderKeyRef.current = providerKey;
      lastAppliedZoomRef.current = FIT_ZOOM_BASE;
    }

    const deltaSteps = Math.round((zoom - lastAppliedZoomRef.current) / 10);

    if (deltaSteps > 0) {
      for (let step = 0; step < deltaSteps; step += 1) {
        controls.zoomIn();
      }
    } else if (deltaSteps < 0) {
      for (let step = 0; step < Math.abs(deltaSteps); step += 1) {
        controls.zoomOut();
      }
    }

    lastAppliedZoomRef.current = zoom;
  }, [controls, isReady, providerKey, zoom]);

  return null;
}

function PlaylistTrackStateBridge({ sources }: { sources: TimelineStemSource[] }) {
  const controls = usePlaylistControls();
  const controlsRef = useRef(controls);
  const previewTracks = useAudioEditorStore((state) => state.previewTracks);
  const previewSignature = sources
    .map((source) => {
      const trackState = previewTracks[source.id];

      return [
        source.id,
        trackState.gainDb,
        trackState.muted,
        trackState.solo,
      ].join(":");
    })
    .join("|");

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    sources.forEach((source, index) => {
      const trackState = previewTracks[source.id];

      controlsRef.current.setTrackVolume(index, dbToGain(trackState.gainDb));
      controlsRef.current.setTrackMute(index, trackState.muted);
      controlsRef.current.setTrackSolo(index, trackState.solo);
    });
  }, [previewSignature, previewTracks, sources]);

  return null;
}

function PlaylistTransportBridge() {
  const controls = usePlaylistControls();
  const data = usePlaylistData();
  const playback = usePlaybackAnimation();
  const setCurrentTime = useAudioEditorStore((state) => state.setCurrentTime);
  const setDuration = useAudioEditorStore((state) => state.setDuration);
  const setIsPlaying = useAudioEditorStore((state) => state.setIsPlaying);
  const setPlaybackController = useAudioEditorStore(
    (state) => state.setPlaybackController,
  );

  useEffect(() => {
    const layoutDurationSec = computeTimelineLayoutDurationSec(data.tracks);
    const durationSec = layoutDurationSec > 0 ? layoutDurationSec : data.duration;
    setDuration(Math.round(durationSec * 1000));
  }, [data.duration, data.tracks, setDuration]);

  useEffect(() => {
    playback.registerFrameCallback("music-editor-playlist", ({ time }) => {
      setCurrentTime(Math.round(time * 1000));
    });

    return () => {
      playback.unregisterFrameCallback("music-editor-playlist");
    };
  }, [playback, setCurrentTime]);

  useEffect(() => {
    if (useAudioEditorStore.getState().isPlaying) {
      return;
    }

    setCurrentTime(Math.round(playback.currentTime * 1000));
  }, [playback.currentTime, setCurrentTime]);

  useEffect(() => {
    const controller: PlaybackController = {
      play: () => {
        const fallbackStartSec = useAudioEditorStore.getState().currentTimeMs / 1000;
        const playbackStartSec = playback.currentTimeRef.current;
        const startSec = Number.isFinite(playbackStartSec)
          ? playbackStartSec
          : fallbackStartSec;
        setCurrentTime(Math.round(startSec * 1000));
        void controls.play(startSec).then(() => setIsPlaying(true));
      },
      pause: () => {
        controls.pause();
        setIsPlaying(false);
      },
      stop: () => {
        controls.stop();
        controls.setCurrentTime(0);
        setCurrentTime(0);
        setIsPlaying(false);
      },
      seek: (ms) => {
        const timeSec = ms / 1000;
        controls.seekTo(timeSec);
        controls.setCurrentTime(timeSec);
        setCurrentTime(ms);
      },
      setZoom: () => undefined,
    };

    setPlaybackController(controller);

    return () => {
      setPlaybackController(null);
    };
  }, [
    controls,
    playback.currentTimeRef,
    setCurrentTime,
    setIsPlaying,
    setPlaybackController,
  ]);

  return null;
}

export function WaveformTimeline({
  regions,
  operations,
  selectedRegionId,
  vocalPlaybackUrl,
  instrumentalPlaybackUrl,
  onSelectRegion,
  onResizeRegion,
  onMoveRegion,
  onResizeTrackRegion,
  onMoveTrackRegion,
  disabled,
}: WaveformTimelineProps) {
  const [linkedTracks, setLinkedTracks] = useState(false);
  const sources = useMemo<TimelineStemSource[]>(() => {
    const nextSources: TimelineStemSource[] = [];

    if (vocalPlaybackUrl) {
      nextSources.push({
        id: "vocal",
        label: "Vocal",
        url: vocalPlaybackUrl,
        color: TRACK_COLORS.vocal,
      });
    }

    if (instrumentalPlaybackUrl) {
      nextSources.push({
        id: "instrumental",
        label: "Instrumental",
        url: instrumentalPlaybackUrl,
        color: TRACK_COLORS.instrumental,
      });
    }

    return nextSources;
  }, [instrumentalPlaybackUrl, vocalPlaybackUrl]);
  const { tracks, isLoading, error } = useRegionPlaylistTracks(
    sources,
    regions,
    operations,
  );
  const regionsLayoutKey = useMemo(
    () => regions.map((region) => region.id).join("|"),
    [regions],
  );
  const playlistLayoutKey = useMemo(() => {
    const tracksSignature = tracks
      .map((track) =>
        track.clips
          .map((clip) => `${clip.id}:${clip.startSample}:${clip.durationSamples}`)
          .join(","),
      )
      .join("|");

    return `${regionsLayoutKey}::${tracksSignature}`;
  }, [regionsLayoutKey, tracks]);
  const [playlistTracks, setPlaylistTracks] = useState<ClipTrack[]>(tracks);
  const [isStructuralSync, setIsStructuralSync] = useState(false);
  const [timelineViewportWidthPx, setTimelineViewportWidthPx] = useState(0);
  const [stableTimelineWidthPx, setStableTimelineWidthPx] = useState(0);
  const playlistShellRef = useRef<HTMLDivElement>(null);
  const pendingOperationRef = useRef<PendingTimelineOperation | null>(null);
  const persistTimerRef = useRef<number | null>(null);
  const providerTracks = isStructuralSync ? tracks : playlistTracks;
  const fitTimelineZoom = useMemo(
    () =>
      resolveTimelineZoomSettings(
        providerTracks,
        stableTimelineWidthPx,
        FIT_ZOOM_BASE,
      ),
    [providerTracks, stableTimelineWidthPx],
  );
  const timelineReady =
    tracks.length > 0 && !isLoading && stableTimelineWidthPx > 0;
  const timelineProviderKey = `${playlistLayoutKey}:${stableTimelineWidthPx}`;

  useEffect(() => {
    setIsStructuralSync(true);
    pendingOperationRef.current = null;

    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
  }, [regionsLayoutKey]);

  useEffect(() => {
    setPlaylistTracks(tracks);

    if (tracks.length === 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsStructuralSync(false);
    }, 400);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [tracks]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (timelineViewportWidthPx <= 0) {
      setStableTimelineWidthPx(0);
      return;
    }

    const timerId = window.setTimeout(() => {
      setStableTimelineWidthPx(timelineViewportWidthPx);
    }, 120);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [timelineViewportWidthPx]);

  useEffect(() => {
    const shell = playlistShellRef.current;

    if (!shell) {
      return;
    }

    const updateWidth = (): void => {
      setTimelineViewportWidthPx(shell.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(shell);

    return () => {
      observer.disconnect();
    };
  }, [tracks.length]);

  const persistTimelineOperation = useCallback(() => {
    const operation = pendingOperationRef.current;
    pendingOperationRef.current = null;

    if (!operation || disabled) {
      return;
    }

    if (operation.type === "resize") {
      if ("trackId" in operation) {
        onResizeTrackRegion(
          operation.trackId,
          operation.regionId,
          operation.startMs,
          operation.endMs,
        );
      } else {
        onResizeRegion(operation.regionId, operation.startMs, operation.endMs);
      }
      return;
    }

    if ("trackId" in operation) {
      onMoveTrackRegion(operation.trackId, operation.regionId, operation.targetIndex);
      return;
    }

    onMoveRegion(operation.regionId, operation.targetIndex);
  }, [
    disabled,
    onMoveRegion,
    onMoveTrackRegion,
    onResizeRegion,
    onResizeTrackRegion,
  ]);

  const handleTracksChange = useCallback(
    (nextTracks: ClipTrack[]) => {
      if (isStructuralSync) {
        return;
      }

      const nextPlaylistTracks = linkedTracks
        ? mirrorRegionClipEdits(nextTracks)
        : nextTracks;
      setPlaylistTracks(nextPlaylistTracks);

      const operation = resolveTimelineOperation(
        nextPlaylistTracks,
        regions,
        operations,
        linkedTracks,
      );

      if (!operation || disabled) {
        return;
      }

      pendingOperationRef.current = operation;

      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
      }

      persistTimerRef.current = window.setTimeout(
        persistTimelineOperation,
        PERSIST_DEBOUNCE_MS,
      );
    },
    [disabled, isStructuralSync, linkedTracks, operations, persistTimelineOperation, regions],
  );

  const handleEnterEdit = useCallback(() => {
    const targetRegion =
      regions.find((region) => region.id === selectedRegionId) ?? regions[0];

    if (targetRegion) {
      onSelectRegion(targetRegion.id);
      seekTimeline(targetRegion.startMs);
    }

    document.getElementById("editor-timeline")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [onSelectRegion, regions, selectedRegionId]);

  return (
    <div className={styles.timelineBlock} id="editor-timeline">
      <div className={styles.timelineHeader}>
        <div className={styles.timelineTitleRow}>
          <p className={styles.blockLabel}>Timeline</p>
          <button
            className={styles.timelineEditButton}
            disabled={disabled || tracks.length === 0 || isLoading}
            type="button"
            onClick={handleEnterEdit}
          >
            Edit
          </button>
          <button
            className={
              linkedTracks ? styles.timelineModeButtonActive : styles.timelineModeButton
            }
            disabled={disabled || tracks.length === 0 || isLoading}
            type="button"
            onClick={() => setLinkedTracks((value) => !value)}
          >
            {linkedTracks ? "Linked tracks" : "Independent tracks"}
          </button>
        </div>
        <TransportControls disabled={disabled || tracks.length === 0 || isLoading} />
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {isLoading ? <p className={styles.panelHint}>Загрузка waveform...</p> : null}

      {tracks.length > 0 || isLoading ? (
        <Tooltip
          block
          content="Цветные клипы являются частью аудио timeline, а не внешним overlay"
        >
          <div className={styles.playlistShell} ref={playlistShellRef}>
            {isLoading ? (
              <p className={styles.playlistShellHint}>Обновление timeline...</p>
            ) : null}
            {!isLoading && !timelineReady ? (
              <p className={styles.playlistShellHint}>Подготовка timeline...</p>
            ) : null}
            {timelineReady ? (
            <WaveformPlaylistProvider
              key={timelineProviderKey}
              automaticScroll
              controls={{ show: false, width: 0 }}
              mono
              sampleRate={AUDIO_CONTEXT_OPTIONS.sampleRate}
              samplesPerPixel={fitTimelineZoom.samplesPerPixel}
              zoomLevels={fitTimelineZoom.zoomLevels}
              timescale
              tracks={providerTracks}
              waveHeight={TRACK_WAVE_HEIGHT}
              onTracksChange={handleTracksChange}
            >
              <PlaylistTimelineZoomBridge providerKey={timelineProviderKey} />
              <PlaylistTransportBridge />
              <PlaylistTrackStateBridge sources={sources} />
              <PlaylistRegionBridge
                containerRef={playlistShellRef}
                regionsLayoutKey={regionsLayoutKey}
                selectedRegionId={selectedRegionId}
                onSelectRegion={onSelectRegion}
              />
              <ClipInteractionProvider touchOptimized>
                <Waveform interactiveClips showClipHeaders touchOptimized />
              </ClipInteractionProvider>
            </WaveformPlaylistProvider>
            ) : null}
          </div>
        </Tooltip>
      ) : null}

      <p className={styles.timelineHint}>
        {linkedTracks
          ? "Linked mode: drag и trim применяются синхронно к Vocal и Instrumental."
          : "Independent mode: drag и trim применяются только к дорожке, которую вы редактируете."}{" "}
        Выделение на timeline или клик по заголовку клипа активирует region actions.
      </p>
    </div>
  );
}
