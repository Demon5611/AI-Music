"use client";

import { CollapsibleLyrics } from "@/features/music-create/collapsible-lyrics";
import { mt } from "@/features/music-create/music-create-classes";
import { buildAudioDownloadFilename } from "@/shared/lib/build-audio-download-filename";
import { DeleteIconButton } from "@/shared/ui/delete-icon-button";
import { DownloadAudioButton } from "@/shared/ui/download-audio-button";
import { AudioPreviewPlayer } from "@/shared/ui/elevenlabs";

interface SongTrackResultProps {
  trackId?: string;
  title: string;
  audioUrl: string;
  lyricsText?: string;
  durationSec?: number;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete?: () => void;
  onOpenEditor?: (trackId: string) => void;
  isOpeningEditor?: boolean;
}

function formatDuration(durationSec?: number): string | null {
  if (!durationSec) {
    return null;
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.round(durationSec % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SongTrackResult({
  trackId,
  title,
  audioUrl,
  lyricsText,
  durationSec,
  canDelete,
  isDeleting,
  onDelete,
  onOpenEditor,
  isOpeningEditor,
}: SongTrackResultProps) {
  const durationLabel = formatDuration(durationSec);

  return (
    <div className={mt.resultPlayer}>
      <div className={mt.resultHeader}>
        <div className={mt.resultMeta}>
          <p className={mt.resultTitle}>{title}</p>
          {durationLabel ? (
            <span className={mt.resultDuration}>{durationLabel}</span>
          ) : null}
        </div>
        <div className={mt.resultActions}>
          <DownloadAudioButton
            audioUrl={audioUrl}
            className={mt.resultDownloadButton}
            filename={buildAudioDownloadFilename(title)}
            label="Скачать"
          />
          {canDelete && onDelete ? (
            <DeleteIconButton
              disabled={isDeleting}
              label="Удалить трек"
              onClick={onDelete}
            />
          ) : null}
        </div>
      </div>
      <AudioPreviewPlayer className={mt.player} src={audioUrl} />
      {trackId && onOpenEditor ? (
        <button
          className={mt.editorLink}
          disabled={isOpeningEditor}
          type="button"
          onClick={() => onOpenEditor(trackId)}
        >
          {isOpeningEditor ? "Открываем редактор..." : "Open Editor"}
        </button>
      ) : null}
      {lyricsText ? <CollapsibleLyrics text={lyricsText} /> : null}
    </div>
  );
}
