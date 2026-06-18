"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useClientMounted } from "@/shared/hooks/use-client-mounted";
import { EditHistoryPanel } from "@/features/music-editor/edit-history-panel";
import { EditorHelpPanel } from "@/features/music-editor/editor-help-panel";
import { EditorHeader } from "@/features/music-editor/editor-header";
import { useEditorOperations } from "@/features/music-editor/hooks/use-editor-operations";
import { useEditorPolling } from "@/features/music-editor/hooks/use-editor-polling";
import { RegionToolbar } from "@/features/music-editor/region-toolbar";
import { RenderButton } from "@/features/music-editor/render-button";
import { SelectedContextPanel } from "@/features/music-editor/selected-context-panel";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { TrackLane } from "@/features/music-editor/track-lane";
import { AuthenticatedBlobUrl } from "@/shared/ui/authenticated-blob-url";
import { useApi } from "@/shared/providers/api-provider";
import {
  HintsVisibilityProvider,
  useHintsVisibility,
} from "@/shared/providers/hints-visibility-provider";
import { me } from "@/features/music-editor/music-editor-classes";
import { cn } from "@/lib/utils";
import { useEditorTransportShortcuts } from "./hooks/use-editor-transport-shortcuts";
import { useEditorInitialLoad } from "./hooks/use-editor-initial-load";
import dynamic from "next/dynamic";

const WaveformTimeline = dynamic(
  () =>
    import("@/features/music-editor/waveform-timeline").then((module) => module.WaveformTimeline),
  {
    ssr: false,
    loading: () => <p className={me.panelHint}>Загрузка timeline...</p>,
  },
);

function TimelinePlaceholder() {
  return <p className={me.panelHint}>Загрузка timeline...</p>;
}

function DeferredWaveformTimeline(props: ComponentProps<typeof WaveformTimeline>) {
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
  const rootClassName = compact ? me.preparationStatusCompact : me.preparationStatus;

  return (
    <div className={rootClassName}>
      <div className={me.preparationHeader}>
        <span className={me.preparationSpinner} aria-hidden="true" />
        <div>
          <p className={me.preparationTitle}>{message}</p>
          <p className={me.preparationMeta}>
            {mounted
              ? `Прошло ${elapsedLabel}. Обычно это занимает до ${estimateLabel}.`
              : "Подготовка может занять до минуты."}
          </p>
        </div>
      </div>

      <div className={me.preparationProgressRow}>
        <progress
          aria-label="Подготовка"
          className={me.preparationProgress}
          max={100}
          value={mounted ? progress : 0}
        />
        <span className={me.preparationProgressValue}>{mounted ? `${progress}%` : "0%"}</span>
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
  const lastUrlsRef = useRef<PlaybackUrls>({
    vocal: null,
    instrumental: null,
  });

  useEffect(() => {
    const nextUrls: PlaybackUrls = {
      vocal: vocalPlaybackUrl ?? lastUrlsRef.current.vocal,
      instrumental: instrumentalPlaybackUrl ?? lastUrlsRef.current.instrumental,
    };

    lastUrlsRef.current = nextUrls;
    onChange(nextUrls);
  }, [instrumentalPlaybackUrl, onChange, vocalPlaybackUrl]);

  return null;
}

export function AudioEditor({ songId }: AudioEditorProps) {
  return (
    <HintsVisibilityProvider>
      <AudioEditorContent songId={songId} />
    </HintsVisibilityProvider>
  );
}

function AudioEditorContent({ songId }: AudioEditorProps) {
  const api = useApi();
  const { hintsVisible } = useHintsVisibility();
  const hydrate = useAudioEditorStore((state) => state.hydrate);
  const setError = useAudioEditorStore((state) => state.setError);
  const regions = useAudioEditorStore((state) => state.regions);
  const tracks = useAudioEditorStore((state) => state.tracks);
  const operations = useAudioEditorStore((state) => state.operations);
  const versions = useAudioEditorStore((state) => state.versions);
  const songStatus = useAudioEditorStore((state) => state.songStatus);
  const selectedRegionId = useAudioEditorStore((state) => state.selectedRegionId);
  const setSelectedRegion = useAudioEditorStore((state) => state.setSelectedRegion);
  const isBusy = useAudioEditorStore((state) => state.isBusy);
  const error = useAudioEditorStore((state) => state.error);

  const {
    setVolume,
    muteTrack,
    soloTrack,
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

  const { isProcessing } = useEditorPolling(songId);
  const { title } = useEditorInitialLoad(songId);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [playbackUrls, setPlaybackUrls] = useState<PlaybackUrls>({
    vocal: null,
    instrumental: null,
  });

  async function handleRender() {
    setIsRendering(true);
    setError(null);
    setRenderError(null);

    try {
      await api.musicEditor.render(songId);
      const state = await api.musicEditor.getEditorState(songId);
      hydrate(state);
    } catch (renderError) {
      const message = parseApiError(renderError, "Editor error");
      setRenderError(message);
      setError(message);
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
  const trackMixControlsDisabled = !editorReady || !stemsReady;

  const statusMessage = (() => {
    if (songStatus === "separating_stems") {
      return "Идет разделение трека на вокал и музыку...";
    }

    return "Подготовка редактора...";
  })();

  return (
    <section className={cn(me.section, !hintsVisible && me.sectionHintsHidden)}>
      <EditorHeader title={title || "Audio Editor"} />

      <EditorHelpPanel />

      {!editorReady ? (
        <div className={me.statusCard}>
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

      <div className={me.layout}>
        <div className={me.mainColumn}>
          <div className={me.panel}>
            <h3 className={me.panelTitle}>Tracks (изменения в рамках всего трека)</h3>
            {!stemsReady ? (
              <EditorPreparationStatus compact key={statusMessage} message={statusMessage} />
            ) : null}
            <div className={me.trackList}>
              {tracks.map((track) => (
                <TrackLane
                  key={track.id}
                  disabled={trackControlsDisabled}
                  mixControlsDisabled={trackMixControlsDisabled}
                  regionSelected={regions.length > 0}
                  track={track}
                  onMuteToggle={muteTrack}
                  onSoloToggle={soloTrack}
                  onVolumeCommit={setVolume}
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
            onFadeIn={() => fadeRegion("in")}
            onFadeOut={() => fadeRegion("out")}
            onMoveLeft={() => moveRegion("left")}
            onMoveRight={() => moveRegion("right")}
            onSplit={splitRegion}
          />
        </div>

        <div className={me.sideColumn}>
          <EditHistoryPanel
            disabled={controlsDisabled}
            operations={operations}
            onRedo={() => void redo()}
            onUndo={() => void undo()}
          />

          <RenderButton
            disabled={controlsDisabled}
            isRendering={isRendering}
            renderError={renderError}
            songTitle={title || "track"}
            versions={versions}
            onRender={() => void handleRender()}
          />
        </div>
      </div>

      {error ? <p className={me.error}>{error}</p> : null}
    </section>
  );
}
