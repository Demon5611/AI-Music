"use client";

import type { EditorTrackId } from "@ai-music/shared";
import { useCallback, useEffect, useRef } from "react";
import {
  useAudioEditorStore,
  type PlaybackController,
} from "@/features/music-editor/store/audio-editor-store";

function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

function resolveTrackVolume(
  trackId: EditorTrackId,
  previewTracks: Record<EditorTrackId, { gainDb: number; muted: boolean; solo: boolean }>,
): number {
  const soloTrack = (["vocal", "instrumental"] as const).find(
    (id) => previewTracks[id].solo,
  );

  if (soloTrack && soloTrack !== trackId) {
    return 0;
  }

  const track = previewTracks[trackId];

  if (track.muted) {
    return 0;
  }

  return dbToGain(track.gainDb);
}

function resolveDurationMs(
  vocal: HTMLAudioElement | null,
  instrumental: HTMLAudioElement | null,
): number {
  const durations = [vocal, instrumental]
    .filter((element): element is HTMLAudioElement => element !== null)
    .map((element) => element.duration)
    .filter((value) => Number.isFinite(value) && value > 0);

  if (durations.length === 0) {
    return 0;
  }

  return Math.round(Math.max(...durations) * 1000);
}

export function useStemPlayback(vocalUrl: string | null, instrumentalUrl: string | null) {
  const previewTracks = useAudioEditorStore((state) => state.previewTracks);
  const setCurrentTime = useAudioEditorStore((state) => state.setCurrentTime);
  const setDuration = useAudioEditorStore((state) => state.setDuration);
  const setIsPlaying = useAudioEditorStore((state) => state.setIsPlaying);
  const setPlaybackController = useAudioEditorStore((state) => state.setPlaybackController);

  const vocalRef = useRef<HTMLAudioElement | null>(null);
  const instrumentalRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const syncVolumes = useCallback(() => {
    const vocal = vocalRef.current;
    const instrumental = instrumentalRef.current;
    const tracks = useAudioEditorStore.getState().previewTracks;

    if (vocal) {
      vocal.volume = Math.min(1, resolveTrackVolume("vocal", tracks));
    }

    if (instrumental) {
      instrumental.volume = Math.min(
        1,
        resolveTrackVolume("instrumental", tracks),
      );
    }
  }, []);

  useEffect(() => {
    syncVolumes();
  }, [previewTracks, syncVolumes]);

  useEffect(() => {
    if (!vocalUrl && !instrumentalUrl) {
      return;
    }

    const vocal = vocalUrl ? new Audio(vocalUrl) : null;
    const instrumental = instrumentalUrl ? new Audio(instrumentalUrl) : null;

    vocalRef.current = vocal;
    instrumentalRef.current = instrumental;

    function updateDuration() {
      const nextDuration = resolveDurationMs(vocalRef.current, instrumentalRef.current);

      if (nextDuration > 0) {
        setDuration(nextDuration);
      }
    }

    vocal?.addEventListener("loadedmetadata", updateDuration);
    instrumental?.addEventListener("loadedmetadata", updateDuration);
    updateDuration();
    syncVolumes();

    return () => {
      vocal?.removeEventListener("loadedmetadata", updateDuration);
      instrumental?.removeEventListener("loadedmetadata", updateDuration);
      vocal?.pause();
      instrumental?.pause();
      vocalRef.current = null;
      instrumentalRef.current = null;
    };
  }, [instrumentalUrl, setDuration, syncVolumes, vocalUrl]);

  useEffect(() => {
    function tick() {
      const state = useAudioEditorStore.getState();
      const primary = instrumentalRef.current ?? vocalRef.current;

      if (primary && state.isPlaying) {
        const timeMs = Math.round(primary.currentTime * 1000);
        setCurrentTime(timeMs);

        if (state.loopSelected && state.selectedRegionId) {
          const selectedRegion = state.regions.find(
            (region) => region.id === state.selectedRegionId,
          );

          if (selectedRegion && timeMs >= selectedRegion.endMs) {
            const startSec = selectedRegion.startMs / 1000;

            if (vocalRef.current) {
              vocalRef.current.currentTime = startSec;
            }
            if (instrumentalRef.current) {
              instrumentalRef.current.currentTime = startSec;
            }

            setCurrentTime(selectedRegion.startMs);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [setCurrentTime]);

  useEffect(() => {
    const controller: PlaybackController = {
      play: () => {
        const timeSec = useAudioEditorStore.getState().currentTimeMs / 1000;

        if (vocalRef.current) {
          vocalRef.current.currentTime = timeSec;
        }
        if (instrumentalRef.current) {
          instrumentalRef.current.currentTime = timeSec;
        }

        void vocalRef.current?.play();
        void instrumentalRef.current?.play();
        setIsPlaying(true);
      },
      pause: () => {
        vocalRef.current?.pause();
        instrumentalRef.current?.pause();
        setIsPlaying(false);
      },
      stop: () => {
        if (vocalRef.current) {
          vocalRef.current.pause();
          vocalRef.current.currentTime = 0;
        }
        if (instrumentalRef.current) {
          instrumentalRef.current.pause();
          instrumentalRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentTime(0);
      },
      seek: (ms) => {
        const { durationMs } = useAudioEditorStore.getState();
        const clamped = Math.min(
          durationMs > 0 ? durationMs : Number.MAX_SAFE_INTEGER,
          Math.max(0, ms),
        );
        const seconds = clamped / 1000;

        if (vocalRef.current) {
          vocalRef.current.currentTime = seconds;
        }
        if (instrumentalRef.current) {
          instrumentalRef.current.currentTime = seconds;
        }

        setCurrentTime(clamped);
      },
      setZoom: () => {
        // Zoom is handled by WaveSurfer in the timeline component.
      },
    };

    setPlaybackController(controller);

    return () => {
      setPlaybackController(null);
    };
  }, [setCurrentTime, setIsPlaying, setPlaybackController]);
}
