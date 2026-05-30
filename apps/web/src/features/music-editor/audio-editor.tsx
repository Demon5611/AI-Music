"use client";

import { ApiError } from "@ai-music/api-client";
import { useEffect, useState, type ComponentProps } from "react";
import { useClientMounted } from "@/shared/hooks/use-client-mounted";
import { AiCommandPanel } from "@/features/music-editor/ai-command-panel";
import { EditHistoryPanel } from "@/features/music-editor/edit-history-panel";
import { EditorHelpPanel } from "@/features/music-editor/editor-help-panel";
import { useEditorAiActions } from "@/features/music-editor/hooks/use-editor-ai-actions";
import { useEditorOperations } from "@/features/music-editor/hooks/use-editor-operations";
import { useEditorPolling } from "@/features/music-editor/hooks/use-editor-polling";
import { RegionToolbar } from "@/features/music-editor/region-toolbar";
import { RenderButton } from "@/features/music-editor/render-button";
import { SelectedContextPanel } from "@/features/music-editor/selected-context-panel";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { TrackLane } from "@/features/music-editor/track-lane";
import { VoiceTransferDialog } from "@/features/music-editor/voice-transfer-dialog";
import { AuthenticatedBlobUrl } from "@/shared/ui/authenticated-blob-url";
import { useApi } from "@/shared/providers/api-provider";
import styles from "@/features/music-editor/styles/music-editor.module.css";
import { useEditorTransportShortcuts } from "./hooks/use-editor-transport-shortcuts";
import { useEditorInitialLoad } from "./hooks/use-editor-initial-load";
import dynamic from "next/dynamic";

const WaveformTimeline = dynamic(
  () =>
    import("@/features/music-editor/waveform-timeline").then(
      (module) => module.WaveformTimeline,
    ),
  {
    ssr: false,
    loading: () => <p className={styles.panelHint}>Загрузка timeline...</p>,
  },
);

function TimelinePlaceholder() {
  return <p className={styles.panelHint}>Загрузка timeline...</p>;
}

function DeferredWaveformTimeline(
  props: ComponentProps<typeof WaveformTimeline>,
) {
  const mounted = useClientMounted();

  if (!mounted) {
    return <TimelinePlaceholder />;
  }

  return <WaveformTimeline {...props} />;
}

interface AudioEditorProps {
  songId: string;
}

interface PlaybackUrls {
  vocal: string | null;
  instrumental: string | null;
}

const EDITOR_PREPARATION_ESTIMATE_SEC = 60;

function formatElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function useElapsedSeconds(): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  return elapsedSeconds;
}

function EditorPreparationStatus({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  const mounted = useClientMounted();
  const elapsedSeconds = useElapsedSeconds();
  const progress = Math.min(
    95,
    Math.round((elapsedSeconds / EDITOR_PREPARATION_ESTIMATE_SEC) * 100),
  );
  const elapsedLabel = formatElapsedTime(elapsedSeconds);
  const estimateLabel = formatElapsedTime(EDITOR_PREPARATION_ESTIMATE_SEC);
  const rootClassName = compact
    ? styles.preparationStatusCompact
    : styles.preparationStatus;

  return (
    <div className={rootClassName}>
      <div className={styles.preparationHeader}>
        <span className={styles.preparationSpinner} aria-hidden="true" />
        <div>
          <p className={styles.preparationTitle}>{message}</p>
          <p className={styles.preparationMeta}>
            {mounted
              ? `Прошло ${elapsedLabel}. Обычно это занимает до ${estimateLabel}.`
              : "Подготовка может занять до минуты."}
          </p>
        </div>
      </div>

      <div className={styles.preparationProgressRow}>
        <progress
          aria-label="Подготовка"
          className={styles.preparationProgress}
          max={100}
          value={mounted ? progress : 0}
        />
        <span className={styles.preparationProgressValue}>
          {mounted ? `${progress}%` : "0%"}
        </span>
      </div>
    </div>
  );
}

function PlaybackUrlBridge({
  vocalPlaybackUrl,
  instrumentalPlaybackUrl,
  onChange,
}: {
  vocalPlaybackUrl: string | null;
  instrumentalPlaybackUrl: string | null;
  onChange: (urls: PlaybackUrls) => void;
}) {
  useEffect(() => {
    onChange({
      vocal: vocalPlaybackUrl,
      instrumental: instrumentalPlaybackUrl,
    });
  }, [instrumentalPlaybackUrl, onChange, vocalPlaybackUrl]);

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
  const setSelectedRegion = useAudioEditorStore((state) => state.setSelectedRegion);
  const isBusy = useAudioEditorStore((state) => state.isBusy);
  const error = useAudioEditorStore((state) => state.error);

  const {
    splitRegion,
    duplicateRegion,
    fadeRegion,
    moveRegion,
    moveRegionToIndex,
    moveTrackRegionToIndex,
    deleteRegion,
    resizeRegion,
    resizeTrackRegion,
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
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [playbackUrls, setPlaybackUrls] = useState<PlaybackUrls>({
    vocal: null,
    instrumental: null,
  });

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
      </div>

      <EditorHelpPanel />

      {!editorReady ? (
        <div className={styles.statusCard}>
          <EditorPreparationStatus key={statusMessage} message={statusMessage} />
        </div>
      ) : null}

      <AuthenticatedBlobUrl src={vocalTrack?.audioUrl ?? null}>
        {(vocalPlaybackUrl) => (
          <AuthenticatedBlobUrl src={instrumentalTrack?.audioUrl ?? null}>
            {(instrumentalPlaybackUrl) => (
              <PlaybackUrlBridge
                instrumentalPlaybackUrl={instrumentalPlaybackUrl}
                vocalPlaybackUrl={vocalPlaybackUrl}
                onChange={setPlaybackUrls}
              />
            )}
          </AuthenticatedBlobUrl>
        )}
      </AuthenticatedBlobUrl>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <DeferredWaveformTimeline
            disabled={controlsDisabled}
            instrumentalPlaybackUrl={playbackUrls.instrumental}
            onMoveRegion={moveRegionToIndex}
            onMoveTrackRegion={moveTrackRegionToIndex}
            onResizeRegion={resizeRegion}
            onResizeTrackRegion={resizeTrackRegion}
            operations={operations}
            regions={regions}
            selectedRegionId={selectedRegionId}
            vocalPlaybackUrl={playbackUrls.vocal}
            onSelectRegion={setSelectedRegion}
          />

          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Tracks</h3>
            {!stemsReady ? (
              <EditorPreparationStatus compact key={statusMessage} message={statusMessage} />
            ) : null}
            <div className={styles.trackList}>
              {tracks.map((track) => (
                <TrackLane
                  key={track.id}
                  disabled={trackControlsDisabled}
                  track={track}
                />
              ))}
            </div>
          </div>

          <SelectedContextPanel />

          <RegionToolbar
            disabled={controlsDisabled}
            regionSelected={Boolean(selectedRegionId)}
            onDelete={deleteRegion}
            onDuplicate={duplicateRegion}
            onExtend={() => void extendSong()}
            onFadeIn={() => fadeRegion("in")}
            onFadeOut={() => fadeRegion("out")}
            onMoveLeft={() => moveRegion("left")}
            onMoveRight={() => moveRegion("right")}
            onRegenerate={() =>
              void regenerateRegion("Regenerate this section with fresh energy")
            }
            onReplaceVocal={() => setVoiceDialogOpen(true)}
            onSplit={splitRegion}
          />
        </div>

        <div className={styles.sideColumn}>
          <AiCommandPanel
            disabled={controlsDisabled}
            lastExplanation={lastExplanation}
            onCancelPreview={cancelAiPreview}
            onConfirm={confirmAiCommand}
            onPreview={previewAiCommand}
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
