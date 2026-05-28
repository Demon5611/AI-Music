"use client";

import { ApiError } from "@ai-music/api-client";
import { useCallback, useEffect, useState } from "react";
import { EditHistoryPanel } from "@/features/music-editor/edit-history-panel";
import { useEditorOperations } from "@/features/music-editor/hooks/use-editor-operations";
import { MixerPanel } from "@/features/music-editor/mixer-panel";
import { RegionToolbar } from "@/features/music-editor/region-toolbar";
import { RenderButton } from "@/features/music-editor/render-button";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { TrackLane } from "@/features/music-editor/track-lane";
import { WaveformTimeline } from "@/features/music-editor/waveform-timeline";
import { useApi } from "@/shared/providers/api-provider";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface AudioEditorProps {
  songId: string;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === "object") {
    const body = error.body as { error?: string };
    if (body.error) {
      return body.error;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Editor error";
}

export function AudioEditor({ songId }: AudioEditorProps) {
  const api = useApi();
  const hydrate = useAudioEditorStore((state) => state.hydrate);
  const setBusy = useAudioEditorStore((state) => state.setBusy);
  const setError = useAudioEditorStore((state) => state.setError);
  const regions = useAudioEditorStore((state) => state.regions);
  const tracks = useAudioEditorStore((state) => state.tracks);
  const operations = useAudioEditorStore((state) => state.operations);
  const versions = useAudioEditorStore((state) => state.versions);
  const songStatus = useAudioEditorStore((state) => state.songStatus);
  const selectedRegionId = useAudioEditorStore((state) => state.selectedRegionId);
  const selectedTrackId = useAudioEditorStore((state) => state.selectedTrackId);
  const setSelectedRegion = useAudioEditorStore((state) => state.setSelectedRegion);
  const setSelectedTrack = useAudioEditorStore((state) => state.setSelectedTrack);
  const isBusy = useAudioEditorStore((state) => state.isBusy);
  const error = useAudioEditorStore((state) => state.error);

  const {
    setVolume,
    muteTrack,
    splitRegion,
    duplicateRegion,
    fadeRegion,
    moveRegion,
  } = useEditorOperations();

  const [isRendering, setIsRendering] = useState(false);
  const [title, setTitle] = useState("");

  const loadEditor = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      let state = await api.musicEditor.getEditorState(songId);

      if (state.song.status !== "ready") {
        state = await api.musicEditor.separateStems(songId);
      }

      hydrate(state);
      setTitle(state.song.title);
    } catch (loadError) {
      setError(resolveErrorMessage(loadError));
    } finally {
      setBusy(false);
    }
  }, [api, hydrate, setBusy, setError, songId]);

  useEffect(() => {
    void loadEditor();
  }, [loadEditor]);

  async function handleRender() {
    setIsRendering(true);
    setError(null);

    try {
      await api.musicEditor.render(songId);
      const state = await api.musicEditor.getEditorState(songId);
      hydrate(state);
    } catch (renderError) {
      setError(resolveErrorMessage(renderError));
    } finally {
      setIsRendering(false);
    }
  }

  const masterAudioUrl =
    tracks.find((track) => track.id === "instrumental")?.audioUrl ??
    tracks.find((track) => track.id === "vocal")?.audioUrl ??
    null;

  const editorReady = songStatus === "ready";
  const controlsDisabled = isBusy || !editorReady;

  return (
    <section className={styles.section}>
      <div>
        <h1 className={styles.title}>{title || "Audio Editor"}</h1>
        <p className={styles.description}>
          Waveform-редактор с дорожками Vocal / Instrumental и детерминированными
          операциями volume, mute, split, fade, move и render через ffmpeg.
        </p>
      </div>

      {!editorReady ? (
        <div className={styles.statusCard}>
          <p className={styles.panelHint}>
            {songStatus === "separating_stems"
              ? "Идёт stem separation через SunoAPI..."
              : "Подготовка редактора..."}
          </p>
        </div>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <WaveformTimeline
            audioUrl={masterAudioUrl}
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegion}
          />

          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Tracks</h3>
            <div className={styles.trackList}>
              {tracks.map((track) => (
                <TrackLane
                  key={track.id}
                  selected={selectedTrackId === track.id}
                  track={track}
                  onSelect={() => setSelectedTrack(track.id)}
                />
              ))}
            </div>
          </div>

          <RegionToolbar
            disabled={controlsDisabled}
            onDuplicate={duplicateRegion}
            onExtend={() =>
              setError("Extend через SunoAPI будет в Stage 5 (AI actions)")
            }
            onFadeIn={() => fadeRegion("in")}
            onFadeOut={() => fadeRegion("out")}
            onMoveLeft={() => moveRegion("left")}
            onMoveRight={() => moveRegion("right")}
            onRegenerate={() =>
              setError("Regenerate region будет в Stage 5 (strict JSON AI)")
            }
            onReplaceVocal={() =>
              setError("Voice transfer: выберите voice model в Kits test (Stage 5)")
            }
            onSplit={splitRegion}
          />
        </div>

        <div className={styles.sideColumn}>
          <MixerPanel
            disabled={controlsDisabled}
            operations={operations}
            selectedRegionId={selectedRegionId}
            selectedTrackId={selectedTrackId}
            tracks={tracks}
            onInstrumentalQuieter={() => setVolume("instrumental", -3)}
            onMuteVocal={() => muteTrack("vocal", true)}
            onSelectTrack={setSelectedTrack}
            onVocalQuieter={() => setVolume("vocal", -3)}
          />

          <EditHistoryPanel operations={operations} />

          <RenderButton
            disabled={controlsDisabled}
            isRendering={isRendering}
            versions={versions}
            onRender={() => void handleRender()}
          />
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
