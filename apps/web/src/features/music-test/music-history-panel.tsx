"use client";

import type { MusicGenerationRecordDto } from "@ai-music/shared";
import { useMemo, useState } from "react";
import { CollapsibleLyrics } from "@/features/music-test/collapsible-lyrics";
import { AuthenticatedAudio } from "@/shared/ui/authenticated-audio";
import { DeleteIconButton } from "@/shared/ui/delete-icon-button";
import styles from "./styles/music-test.module.css";

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
    return <p className={styles.meta}>Загрузка истории...</p>;
  }

  if (items.length === 0) {
    return (
      <p className={styles.meta}>
        История пуста. Запустите генерацию — результаты сохранятся здесь.
      </p>
    );
  }

  return (
    <div className={styles.historyList}>
      <div className={styles.historyToolbar}>
        <label className={styles.historyCheckboxLabel}>
          <input
            checked={allSelected}
            className={styles.historyCheckbox}
            type="checkbox"
            onChange={toggleAll}
          />
        </label>
        <span className={styles.historyToolbarTitle}>
          {hasSelection ? `Выбрано: ${selectedIds.length}` : "Выбрать все"}
        </span>
        <DeleteIconButton
          disabled={!hasSelection || isDeleting}
          label="Удалить выбранные"
          onClick={() => void handleDeleteSelected()}
        />
      </div>

      {items.map((item) => (
        <article className={styles.historyItem} key={item.id}>
          <div className={styles.historyHeader}>
            <label className={styles.historyCheckboxLabel}>
              <input
                checked={selectedSet.has(item.id)}
                className={styles.historyCheckbox}
                type="checkbox"
                onChange={() => toggleItem(item.id)}
              />
            </label>
            <div className={styles.historyHeaderMain}>
              <div className={styles.historyTitleRow}>
                <h3 className={styles.historyTitle}>
                  {item.title ?? item.prompt.slice(0, 60)}
                </h3>
                <DeleteIconButton
                  disabled={isDeleting}
                  label="Удалить запись"
                  onClick={() => void handleDeleteOne(item.id)}
                />
              </div>
              <div className={styles.historyTitleMeta}>
                <span className={styles.historyBadge}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
                <p className={styles.historyMeta}>
                  {item.type === "song" ? "Трек" : "Текст для трека"} ·{" "}
                  {formatDate(item.createdAt)}
                  {item.rawStatus ? ` · ${item.rawStatus}` : ""}
                </p>
              </div>
            </div>
          </div>

          {item.tracks.map((track) => (
            <div className={styles.historyTrack} key={track.id}>
              <div className={styles.historyTrackHeader}>
                <div className={styles.historyTrackMeta}>
                  <p className={styles.historyTrackTitle}>{track.title}</p>
                  {formatDuration(track.durationSec) ? (
                    <span className={styles.resultDuration}>
                      {formatDuration(track.durationSec)}
                    </span>
                  ) : null}
                </div>
                <DeleteIconButton
                  disabled={isDeleting}
                  label="Удалить трек"
                  onClick={() => void onDeleteTrack(track.id)}
                />
              </div>
              {track.audioUrl ? (
                <AuthenticatedAudio
                  className={styles.player}
                  src={track.audioUrl}
                />
              ) : null}
              {item.type === "song" && track.audioUrl && onOpenEditor ? (
                <button
                  className={styles.editorLink}
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
                <CollapsibleLyrics text={track.lyricsText} />
              ) : null}
            </div>
          ))}

          {item.lyrics?.map((lyricsItem, index) => (
            <CollapsibleLyrics
              key={`${item.id}-lyrics-${index}`}
              text={lyricsItem.text}
            />
          ))}

          {item.errorMessage ? (
            <p className={styles.error}>{item.errorMessage}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
