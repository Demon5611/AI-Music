"use client";

import { ApiError } from "@ai-music/api-client";
import {  useState } from "react";
import { AiCommandPanel } from "@/features/music-editor/ai-command-panel";
import { EditHistoryPanel } from "@/features/music-editor/edit-history-panel";
import { EditorHelpPanel } from "@/features/music-editor/editor-help-panel";
import { useEditorAiActions } from "@/features/music-editor/hooks/use-editor-ai-actions";
import { useEditorOperations } from "@/features/music-editor/hooks/use-editor-operations";
import { useEditorPolling } from "@/features/music-editor/hooks/use-editor-polling";
import { useStemPlayback } from "@/features/music-editor/hooks/use-stem-playback";
import { MixerPanel } from "@/features/music-editor/mixer-panel";
import { RegionToolbar } from "@/features/music-editor/region-toolbar";
import { RenderButton } from "@/features/music-editor/render-button";
import { SelectedContextPanel } from "@/features/music-editor/selected-context-panel";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { TrackLane } from "@/features/music-editor/track-lane";
import { VoiceTransferDialog } from "@/features/music-editor/voice-transfer-dialog";
import { WaveformTimeline } from "@/features/music-editor/waveform-timeline";
import { AuthenticatedBlobUrl } from "@/shared/ui/authenticated-blob-url";
import { useApi } from "@/shared/providers/api-provider";
import styles from "@/features/music-editor/styles/music-editor.module.css";
import { useEditorTransportShortcuts } from "./hooks/use-editor-transport-shortcuts";
import { useEditorInitialLoad } from "./hooks/use-editor-initial-load";

interface AudioEditorProps {
  songId: string;
}

function StemPlaybackBridge({
  vocalPlaybackUrl,
  instrumentalPlaybackUrl,
}: {
  vocalPlaybackUrl: string | null;
  instrumentalPlaybackUrl: string | null;
}) {
  useStemPlayback(vocalPlaybackUrl, instrumentalPlaybackUrl);
  return null;
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
    cutRegion,
    resizeRegion,
    undo,
    redo,
  } = useEditorOperations();

  const {
    lastExplanation,
    previewAiCommand,
    confirmAiCommand,
    cancelAiPreview,
    extendSong,
    regenerateRegion,
    voiceTransfer,
  } = useEditorAiActions();

  const { isProcessing } = useEditorPolling(songId);
  const { title } = useEditorInitialLoad(songId);
  const [isRendering, setIsRendering] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);

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

  const vocalTrack = tracks.find((track) => track.id === "vocal");
  const instrumentalTrack = tracks.find((track) => track.id === "instrumental");

  const editorReady = songStatus === "ready" && !isProcessing;
  const stemsReady = editorReady && Boolean(vocalTrack?.audioUrl || instrumentalTrack?.audioUrl);
  const controlsDisabled = isBusy || !editorReady;
  useEditorTransportShortcuts(controlsDisabled);
  const trackControlsDisabled = controlsDisabled || !stemsReady;

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
      return "Идет разделение трека на вокал и музыку...";
    }

    return "Подготовка редактора...";
  })();

  return (
    <section className={styles.section}>
      <div>
        <h1 className={styles.title}>{title || "Audio Editor"}</h1>
        <p className={styles.description}>
          Интерактивный waveform-редактор с AI-командами, extend/regenerate и
          voice transfer.
        </p>
      </div>

      <EditorHelpPanel />

      {!editorReady ? (
        <div className={styles.statusCard}>
          <p className={styles.panelHint}>{statusMessage}</p>
        </div>
      ) : null}

      <AuthenticatedBlobUrl src={vocalTrack?.audioUrl ?? null}>
        {(vocalPlaybackUrl) => (
          <AuthenticatedBlobUrl src={instrumentalTrack?.audioUrl ?? null}>
            {(instrumentalPlaybackUrl) => (
              <StemPlaybackBridge
                instrumentalPlaybackUrl={instrumentalPlaybackUrl}
                vocalPlaybackUrl={vocalPlaybackUrl}
              />
            )}
          </AuthenticatedBlobUrl>
        )}
      </AuthenticatedBlobUrl>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <WaveformTimeline
            disabled={controlsDisabled}
            regions={regions}
            selectedRegionId={selectedRegionId}
            onResizeRegion={resizeRegion}
            onSelectRegion={setSelectedRegion}
          />

          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Tracks</h3>
            {!stemsReady ? (
              <p className={styles.panelHint}>
                Идет разделение трека на вокал и музыку...
              </p>
            ) : null}
            <div className={styles.trackList}>
              {tracks.map((track) => (
                <TrackLane
                  key={track.id}
                  disabled={trackControlsDisabled}
                  selected={selectedTrackId === track.id}
                  track={track}
                  onSelect={() => setSelectedTrack(track.id)}
                />
              ))}
            </div>
          </div>

          <SelectedContextPanel />

          <RegionToolbar
            disabled={controlsDisabled}
            regionSelected={Boolean(selectedRegionId)}
            onCut={cutRegion}
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
              disabled={controlsDisabled || !selectedRegionId}
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
            onCancelPreview={cancelAiPreview}
            onConfirm={confirmAiCommand}
            onPreview={previewAiCommand}
          />

          <MixerPanel
            disabled={trackControlsDisabled}
            operations={operations}
            selectedRegionId={selectedRegionId}
            selectedTrackId={selectedTrackId}
            tracks={tracks}
            onApplyGain={(trackId, gainDb) => setVolume(trackId, gainDb)}
            onMuteTrack={(trackId) => muteTrack(trackId, true)}
            onSelectTrack={setSelectedTrack}
          />

          <EditHistoryPanel
            disabled={controlsDisabled}
            operations={operations}
            onRedo={() => void redo()}
            onUndo={() => void undo()}
          />

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
