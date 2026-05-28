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

export function useStemPlayback(vocalUrl: string | null, instrumentalUrl: string | null) {
  const previewTracks = useAudioEditorStore((state) => state.previewTracks);
  const loopSelected = useAudioEditorStore((state) => state.loopSelected);
  const selectedRegionId = useAudioEditorStore((state) => state.selectedRegionId);
  const regions = useAudioEditorStore((state) => state.regions);
  const setCurrentTime = useAudioEditorStore((state) => state.setCurrentTime);
  const setDuration = useAudioEditorStore((state) => state.setDuration);
  const setIsPlaying = useAudioEditorStore((state) => state.setIsPlaying);
  const setPlaybackController = useAudioEditorStore((state) => state.setPlaybackController);
  const zoom = useAudioEditorStore((state) => state.zoom);

  const vocalRef = useRef<HTMLAudioElement | null>(null);
  const instrumentalRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const syncVolumes = useCallback(() => {
    const vocal = vocalRef.current;
    const instrumental = instrumentalRef.current;

    if (vocal) {
      vocal.volume = Math.min(1, resolveTrackVolume("vocal", previewTracks));
    }

    if (instrumental) {
      instrumental.volume = Math.min(
        1,
        resolveTrackVolume("instrumental", previewTracks),
      );
    }
  }, [previewTracks]);

  useEffect(() => {
    syncVolumes();
  }, [syncVolumes]);

  useEffect(() => {
    if (!vocalUrl && !instrumentalUrl) {
      return;
    }

    const vocal = vocalUrl ? new Audio(vocalUrl) : null;
    const instrumental = instrumentalUrl ? new Audio(instrumentalUrl) : null;

    vocalRef.current = vocal;
    instrumentalRef.current = instrumental;

    const primary = instrumental ?? vocal;

    if (primary) {
      primary.addEventListener("loadedmetadata", () => {
        setDuration(Math.round(primary.duration * 1000));
      });
    }

    syncVolumes();

    return () => {
      vocal?.pause();
      instrumental?.pause();
      vocalRef.current = null;
      instrumentalRef.current = null;
    };
  }, [instrumentalUrl, setDuration, syncVolumes, vocalUrl]);

  useEffect(() => {
    const selectedRegion = regions.find((region) => region.id === selectedRegionId);

    function tick() {
      const primary = instrumentalRef.current ?? vocalRef.current;

      if (!primary) {
        return;
      }

      const timeMs = Math.round(primary.currentTime * 1000);
      setCurrentTime(timeMs);

      if (
        loopSelected &&
        selectedRegion &&
        primary.currentTime * 1000 >= selectedRegion.endMs
      ) {
        const startSec = selectedRegion.startMs / 1000;
        if (vocalRef.current) {
          vocalRef.current.currentTime = startSec;
        }
        if (instrumentalRef.current) {
          instrumentalRef.current.currentTime = startSec;
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
  }, [loopSelected, regions, selectedRegionId, setCurrentTime]);

  useEffect(() => {
    const controller: PlaybackController = {
      play: () => {
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
        const seconds = ms / 1000;

        if (vocalRef.current) {
          vocalRef.current.currentTime = seconds;
        }
        if (instrumentalRef.current) {
          instrumentalRef.current.currentTime = seconds;
        }

        setCurrentTime(ms);
      },
      setZoom: () => {
        // Zoom handled by WaveSurfer timeline surface.
      },
    };

    setPlaybackController(controller);

    return () => {
      setPlaybackController(null);
    };
  }, [setCurrentTime, setIsPlaying, setPlaybackController]);

  return { zoom };
}
