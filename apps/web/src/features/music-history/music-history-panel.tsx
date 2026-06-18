"use client";

import type { MusicGenerationRecordDto } from "@ai-music/shared";
import { useMemo, useState } from "react";
import { CollapsibleLyrics } from "@/shared/ui/collapsible-lyrics";
import { mtk } from "@/shared/theme/music-track-classes";
import { buildAudioDownloadFilename } from "@/shared/lib/build-audio-download-filename";
import { AuthenticatedAudio } from "@/shared/ui/authenticated-audio";
import { DeleteIconButton } from "@/shared/ui/delete-icon-button";
import { DownloadAudioButton } from "@/shared/ui/download-audio-button";
import { formatTrackTitleValue } from "@/entities/track";
import { cn } from "@/lib/utils";

interface MusicHistoryPanelProps {
  items: MusicGenerationRecordDto[];
  isLoading: boolean;
  isDeleting: boolean;
  onDelete: (ids: string[]) => Promise<void>;
  onDeleteTrack: (trackId: string) => Promise<void>;
  onOpenEditor?: (trackId: string) => void;
  openingEditorTrackId?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "В очереди",
  processing: "Генерация",
  completed: "Готово",
  failed: "Ошибка",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(durationSec: number | null): string | null {
  if (!durationSec) {
    return null;
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.round(durationSec % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MusicHistoryPanel({
  items,
  isLoading,
  isDeleting,
  onDelete,
  onDeleteTrack,
  onOpenEditor,
  openingEditorTrackId,
}: MusicHistoryPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const hasSelection = selectedIds.length > 0;

  function toggleItem(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id],
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  }

  async function handleDeleteSelected() {
    if (!hasSelection) {
      return;
    }

    await onDelete(selectedIds);
    setSelectedIds([]);
  }

  async function handleDeleteOne(id: string) {
    await onDelete([id]);
    setSelectedIds((current) => current.filter((itemId) => itemId !== id));
  }

  if (isLoading) {
    return <p className={mtk.meta}>Загрузка истории...</p>;
  }

  if (items.length === 0) {
    return (
      <p className={mtk.meta}>
        История пуста. Создайте трек на странице Music Create — результаты сохранятся здесь.
      </p>
    );
  }

  return (
    <div className={mtk.historyList}>
      <div className={cn(mtk.historyToolbar, "grid-cols-[1fr_auto]")}>
        <label className={cn(mtk.historyCheckboxLabel, "min-w-0 gap-2")}>
          <input
            checked={allSelected}
            className={mtk.historyCheckbox}
            type="checkbox"
            onChange={toggleAll}
          />
          <span className={mtk.historyToolbarTitle}>
            {hasSelection ? `Выбрано: ${selectedIds.length}` : "Выбрать все"}
          </span>
        </label>
        <DeleteIconButton
          disabled={!hasSelection || isDeleting}
          label="Удалить выбранные"
          onClick={() => void handleDeleteSelected()}
        />
      </div>

      {items.map((item) => {
        const itemTitle =
          formatTrackTitleValue(item.title ?? "") ||
          item.prompt.slice(0, 60) ||
          "Untitled track";
        const itemTitleId = `history-item-title-${item.id}`;

        return (
          <article className={mtk.historyItem} key={item.id}>
            <div className={mtk.historyHeader}>
              <label className={mtk.historyCheckboxLabel}>
                <input
                  aria-labelledby={itemTitleId}
                  checked={selectedSet.has(item.id)}
                  className={mtk.historyCheckbox}
                  type="checkbox"
                  onChange={() => toggleItem(item.id)}
                />
              </label>
              <div className={mtk.historyHeaderMain}>
                <div className={mtk.historyTitleRow}>
                  <h3 className={mtk.historyTitle} id={itemTitleId}>
                    {itemTitle}
                  </h3>
                  <DeleteIconButton
                    disabled={isDeleting}
                    label="Удалить запись"
                    onClick={() => void handleDeleteOne(item.id)}
                  />
                </div>
                <div className={mtk.historyTitleMeta}>
                  <span className={mtk.historyBadge}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                  <p className={mtk.historyMeta}>
                    {item.type === "song" ? "Трек" : "Текст для трека"} ·{" "}
                    {formatDate(item.createdAt)}
                    {item.rawStatus ? ` · ${item.rawStatus}` : ""}
                  </p>
                </div>
              </div>
            </div>

            {item.tracks.map((track) => (
              <div className={mtk.historyTrack} key={track.id}>
                <div className={mtk.historyTrackHeader}>
                  <div className={mtk.historyTrackMeta}>
                    <p className={mtk.historyTrackTitle}>
                      {formatTrackTitleValue(track.title)}
                    </p>
                    {formatDuration(track.durationSec) ? (
                      <span className={mtk.resultDuration}>
                        {formatDuration(track.durationSec)}
                      </span>
                    ) : null}
                  </div>
                  <div className={mtk.resultActions}>
                    {track.audioUrl ? (
                      <DownloadAudioButton
                        audioUrl={track.audioUrl}
                        className={mtk.resultDownloadButton}
                        filename={buildAudioDownloadFilename(track.title)}
                        label="Скачать"
                      />
                    ) : null}
                    <DeleteIconButton
                      disabled={isDeleting}
                      label="Удалить трек"
                      onClick={() => void onDeleteTrack(track.id)}
                    />
                  </div>
                </div>
                {track.audioUrl ? (
                  <AuthenticatedAudio className={mtk.player} src={track.audioUrl} />
                ) : null}
                {item.type === "song" && track.audioUrl && onOpenEditor ? (
                  <button
                    className={mtk.editorLink}
                    disabled={openingEditorTrackId === track.id}
                    type="button"
                    onClick={() => onOpenEditor(track.id)}
                  >
                    {openingEditorTrackId === track.id
                      ? "Открываем редактор..."
                      : "Open Editor"}
                  </button>
                ) : null}
                {track.lyricsText ? (
                  <CollapsibleLyrics defaultExpanded={false} text={track.lyricsText} />
                ) : null}
              </div>
            ))}

            {item.lyrics?.map((lyricsItem, index) => (
              <CollapsibleLyrics
                defaultExpanded={false}
                key={`${item.id}-lyrics-${index}`}
                text={lyricsItem.text}
              />
            ))}

            {item.errorMessage ? (
              <p className={mtk.error}>{item.errorMessage}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
