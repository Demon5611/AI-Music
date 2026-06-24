"use client";

import type { MusicStatusResponseDto } from "@ai-music/shared";
import { mc } from "@/features/music-create/music-create-classes";
import { MusicGenerationLoader } from "@/features/music-create/music-generation-loader";
import { SongTrackResult } from "@/features/music-create/song-track-result";
import { GenerationAlbumCoverSection } from "@/shared/ui/track-cover/generation-album-cover-section";

interface MusicCreateResultsProps {
  isBusy: boolean;
  isGenerating: boolean;
  isPolling: boolean;
  isDeletingTrack: boolean;
  isOpeningEditor: boolean;
  openingEditorTrackId: string | null;
  taskId: string | null;
  status: MusicStatusResponseDto | null;
  songTracks: NonNullable<MusicStatusResponseDto["tracks"]>;
  onDeleteTrack: (trackId: string) => void;
  onOpenEditor: (trackId: string) => void;
}

export function MusicCreateResults({
  isBusy,
  isGenerating,
  isPolling,
  isDeletingTrack,
  isOpeningEditor,
  openingEditorTrackId,
  taskId,
  status,
  songTracks,
  onDeleteTrack,
  onOpenEditor,
}: MusicCreateResultsProps) {
  return (
    <>
      {isBusy ? (
        <div className={mc.loaderWrap}>
          <MusicGenerationLoader
            isStarting={isGenerating}
            queueEtaSec={status?.queueEtaSec}
            queuePhase={status?.queuePhase}
            rawStatus={status?.rawStatus}
            status={status?.status}
            taskId={taskId}
          />
        </div>
      ) : null}

      {songTracks.length > 0 ? (
        <div className={mc.tracksList}>
          {status?.recordId ? (
            <GenerationAlbumCoverSection
              albumCoverImages={status.albumCoverImages}
              defaultImageUrl={songTracks[0]?.imageUrl}
              generationId={status.recordId}
              selectedAlbumCoverUrl={status.selectedAlbumCoverUrl}
              title={songTracks[0]?.title ?? "Track"}
            />
          ) : null}
          {songTracks.map((track) =>
            track.audioUrl ? (
              <SongTrackResult
                key={track.id}
                audioUrl={track.audioUrl}
                canDelete={Boolean(track.canDelete)}
                durationSec={track.durationSec}
                isDeleting={isDeletingTrack}
                isOpeningEditor={isOpeningEditor && openingEditorTrackId === track.id}
                lyricsText={track.lyricsText}
                title={track.title}
                trackId={track.id}
                onDelete={() => onDeleteTrack(track.id)}
                onOpenEditor={(id) => onOpenEditor(id)}
              />
            ) : null,
          )}
        </div>
      ) : null}

      {taskId && !isPolling ? (
        <p className={mc.taskMeta}>
          taskId={taskId}, status={status?.status ?? "pending"}
          {status?.rawStatus ? `, raw=${status.rawStatus}` : ""}
        </p>
      ) : null}
    </>
  );
}
