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
  dbToGain,
  mirrorRegionClipEdits,
  resolveTimelineOperation,
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
    setDuration(Math.round(data.duration * 1000));
  }, [data.duration, setDuration]);

  useEffect(() => {
    playback.registerFrameCallback("music-editor-playlist", ({ time }) => {
      setCurrentTime(Math.round(time * 1000));
    });

    return () => {
      playback.unregisterFrameCallback("music-editor-playlist");
    };
  }, [playback, setCurrentTime]);

  useEffect(() => {
    const controller: PlaybackController = {
      play: () => {
        const startSec = useAudioEditorStore.getState().currentTimeMs / 1000;
        void controls.play(startSec).then(() => setIsPlaying(true));
      },
      pause: () => {
        controls.pause();
        setIsPlaying(false);
      },
      stop: () => {
        controls.stop();
        setCurrentTime(0);
        setIsPlaying(false);
      },
      seek: (ms) => {
        controls.seekTo(ms / 1000);
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
  const [playlistTracks, setPlaylistTracks] = useState<ClipTrack[]>(tracks);
  const playlistShellRef = useRef<HTMLDivElement>(null);
  const pendingOperationRef = useRef<PendingTimelineOperation | null>(null);
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setPlaylistTracks(tracks);
  }, [tracks]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

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
    [disabled, linkedTracks, operations, persistTimelineOperation, regions],
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
            disabled={disabled || playlistTracks.length === 0}
            type="button"
            onClick={handleEnterEdit}
          >
            Edit
          </button>
          <button
            className={
              linkedTracks ? styles.timelineModeButtonActive : styles.timelineModeButton
            }
            disabled={disabled || playlistTracks.length === 0}
            type="button"
            onClick={() => setLinkedTracks((value) => !value)}
          >
            {linkedTracks ? "Linked tracks" : "Independent tracks"}
          </button>
        </div>
        <TransportControls disabled={disabled || playlistTracks.length === 0} />
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {isLoading ? <p className={styles.panelHint}>Загрузка waveform...</p> : null}

      {playlistTracks.length > 0 ? (
        <Tooltip
          block
          content="Цветные клипы являются частью аудио timeline, а не внешним overlay"
        >
          <div className={styles.playlistShell} ref={playlistShellRef}>
            <WaveformPlaylistProvider
              automaticScroll
              controls={{ show: false, width: 0 }}
              mono
              samplesPerPixel={2048}
              timescale
              tracks={playlistTracks}
              waveHeight={TRACK_WAVE_HEIGHT}
              onTracksChange={handleTracksChange}
            >
              <PlaylistTransportBridge />
              <PlaylistTrackStateBridge sources={sources} />
              <PlaylistRegionBridge
                containerRef={playlistShellRef}
                selectedRegionId={selectedRegionId}
                onSelectRegion={onSelectRegion}
              />
              <ClipInteractionProvider touchOptimized>
                <Waveform interactiveClips showClipHeaders touchOptimized />
              </ClipInteractionProvider>
            </WaveformPlaylistProvider>
          </div>
        </Tooltip>
      ) : null}

      <p className={styles.timelineHint}>
        {linkedTracks
          ? "Linked mode: drag и trim применяются синхронно к Vocal и Instrumental."
          : "Independent mode: drag и trim применяются только к дорожке, которую вы редактируете."}{" "}
        Клик по заголовку клипа выбирает region и снимает розовое выделение времени.
      </p>
    </div>
  );
}
