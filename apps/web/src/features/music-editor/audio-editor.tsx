"use client";

import { ApiError } from "@ai-music/api-client";
import { useCallback, useEffect, useState } from "react";
import { AiCommandPanel } from "@/features/music-editor/ai-command-panel";
import { EditHistoryPanel } from "@/features/music-editor/edit-history-panel";
import { useEditorAiActions } from "@/features/music-editor/hooks/use-editor-ai-actions";
import { useEditorOperations } from "@/features/music-editor/hooks/use-editor-operations";
import { useEditorPolling } from "@/features/music-editor/hooks/use-editor-polling";
import { MixerPanel } from "@/features/music-editor/mixer-panel";
import { RegionToolbar } from "@/features/music-editor/region-toolbar";
import { RenderButton } from "@/features/music-editor/render-button";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { TrackLane } from "@/features/music-editor/track-lane";
import { VoiceTransferDialog } from "@/features/music-editor/voice-transfer-dialog";
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
  const pendingAction = useAudioEditorStore((state) => state.pendingAction);
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

  const {
    lastExplanation,
    runAiCommand,
    extendSong,
    regenerateRegion,
    voiceTransfer,
  } = useEditorAiActions();

  const { isProcessing } = useEditorPolling(songId);

  const [isRendering, setIsRendering] = useState(false);
  const [title, setTitle] = useState("");
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);

  const loadEditor = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      let state = await api.musicEditor.getEditorState(songId);

      if (state.song.status !== "ready") {
        await api.musicEditor.separateStems(songId);
        state = await api.musicEditor.getEditorState(songId);
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

  async function handleRegenerate() {
    const prompt = regeneratePrompt.trim() || "Regenerate this section with fresh energy";

    await regenerateRegion(prompt);
    setRegeneratePrompt("");
  }

  const masterAudioUrl =
    tracks.find((track) => track.id === "instrumental")?.audioUrl ??
    tracks.find((track) => track.id === "vocal")?.audioUrl ??
    null;

  const editorReady = songStatus === "ready" && !isProcessing;
  const controlsDisabled = isBusy || !editorReady;

  const statusMessage = (() => {
    if (pendingAction?.status === "processing") {
      if (pendingAction.action === "extend") {
        return "Suno extend: генерация продолжения трека...";
      }

      if (pendingAction.action === "regenerate") {
        return "Suno regenerate: перегенерация выбранного фрагмента...";
      }
    }

    if (songStatus === "separating_stems") {
      return "Stem separation через SunoAPI...";
    }

    return "Подготовка редактора...";
  })();

  return (
    <section className={styles.section}>
      <div>
        <h1 className={styles.title}>{title || "Audio Editor"}</h1>
        <p className={styles.description}>
          Waveform-редактор с AI-командами (strict JSON), extend/regenerate через
          SunoAPI и voice transfer через Kits.
        </p>
      </div>

      {!editorReady ? (
        <div className={styles.statusCard}>
          <p className={styles.panelHint}>{statusMessage}</p>
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
            onExtend={() => void extendSong()}
            onFadeIn={() => fadeRegion("in")}
            onFadeOut={() => fadeRegion("out")}
            onMoveLeft={() => moveRegion("left")}
            onMoveRight={() => moveRegion("right")}
            onRegenerate={() => void handleRegenerate()}
            onReplaceVocal={() => setVoiceDialogOpen(true)}
            onSplit={splitRegion}
          />

          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Regenerate prompt</h3>
            <input
              className={styles.textInput}
              disabled={controlsDisabled}
              placeholder="Новый prompt для выбранного региона"
              value={regeneratePrompt}
              onChange={(event) => setRegeneratePrompt(event.target.value)}
            />
          </div>
        </div>

        <div className={styles.sideColumn}>
          <AiCommandPanel
            disabled={controlsDisabled}
            lastExplanation={lastExplanation}
            onSubmit={runAiCommand}
          />

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
            songTitle={title || "track"}
            versions={versions}
            onRender={() => void handleRender()}
          />
        </div>
      </div>

      <VoiceTransferDialog
        disabled={controlsDisabled}
        open={voiceDialogOpen}
        onClose={() => setVoiceDialogOpen(false)}
        onConfirm={voiceTransfer}
      />

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
