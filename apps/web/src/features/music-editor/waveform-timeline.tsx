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
import type { EditorTrackId, SongRegionDto } from "@ai-music/shared";
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
  type PendingTimelineOperation,
  type TimelineStemSource,
} from "@/features/music-editor/utils/waveform-playlist-utils";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface WaveformTimelineProps {
  regions: SongRegionDto[];
  selectedRegionId: string | null;
  vocalPlaybackUrl: string | null;
  instrumentalPlaybackUrl: string | null;
  onSelectRegion: (regionId: string) => void;
  onResizeRegion: (regionId: string, startMs: number, endMs: number) => void;
  onMoveRegion: (regionId: string, targetIndex: number) => void;
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

            return buildRegionTrack(source, audioBuffer, regions);
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
  }, [regions, sources]);

  return { tracks, isLoading, error };
}

function PlaylistTrackStateBridge({ sources }: { sources: TimelineStemSource[] }) {
  const controls = usePlaylistControls();
  const previewTracks = useAudioEditorStore((state) => state.previewTracks);

  useEffect(() => {
    sources.forEach((source, index) => {
      const trackState = previewTracks[source.id];

      controls.setTrackVolume(index, dbToGain(trackState.gainDb));
      controls.setTrackMute(index, trackState.muted);
      controls.setTrackSolo(index, trackState.solo);
    });
  }, [controls, previewTracks, sources]);

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
  selectedRegionId,
  vocalPlaybackUrl,
  instrumentalPlaybackUrl,
  onSelectRegion,
  onResizeRegion,
  onMoveRegion,
  disabled,
}: WaveformTimelineProps) {
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
  const { tracks, isLoading, error } = useRegionPlaylistTracks(sources, regions);
  const [playlistTracks, setPlaylistTracks] = useState<ClipTrack[]>(tracks);
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
      onResizeRegion(operation.regionId, operation.startMs, operation.endMs);
      return;
    }

    onMoveRegion(operation.regionId, operation.targetIndex);
  }, [disabled, onMoveRegion, onResizeRegion]);

  const handleTracksChange = useCallback(
    (nextTracks: ClipTrack[]) => {
      const mirroredTracks = mirrorRegionClipEdits(nextTracks);
      setPlaylistTracks(mirroredTracks);

      const operation = resolveTimelineOperation(mirroredTracks, regions);

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
    [disabled, persistTimelineOperation, regions],
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
          <div className={styles.playlistShell}>
            <WaveformPlaylistProvider
              automaticScroll
              controls={{ show: false, width: 0 }}
              samplesPerPixel={2048}
              timescale
              tracks={playlistTracks}
              waveHeight={96}
              onTracksChange={handleTracksChange}
            >
              <PlaylistTransportBridge />
              <PlaylistTrackStateBridge sources={sources} />
              <ClipInteractionProvider>
                <Waveform interactiveClips showClipHeaders showFades />
              </ClipInteractionProvider>
            </WaveformPlaylistProvider>
          </div>
        </Tooltip>
      ) : null}

      <p className={styles.timelineHint}>
        Timeline собран из нативных clips: duplicate, cut и split меняют
        структуру дорожки без внешних overlay-слоев. Drag и trim сохраняются как
        операции редактора.
      </p>
    </div>
  );
}
