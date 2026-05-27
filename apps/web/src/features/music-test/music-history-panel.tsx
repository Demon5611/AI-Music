import type { MusicGenerationRecordDto } from "@ai-music/shared";
import { AuthenticatedAudio } from "@/shared/ui/authenticated-audio";
import styles from "./styles/music-test.module.css";

interface MusicHistoryPanelProps {
  items: MusicGenerationRecordDto[];
  isLoading: boolean;
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

export function MusicHistoryPanel({ items, isLoading }: MusicHistoryPanelProps) {
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
      {items.map((item) => (
        <article className={styles.historyItem} key={item.id}>
          <div className={styles.historyHeader}>
            <h3 className={styles.historyTitle}>
              {item.title ?? item.prompt.slice(0, 60)}
            </h3>
            <span className={styles.historyBadge}>
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </div>
          <p className={styles.historyMeta}>
            {item.type === "song" ? "Трек" : "Текст для трека"} ·{" "}
            {formatDate(item.createdAt)}
            {item.rawStatus ? ` · ${item.rawStatus}` : ""}
          </p>
          {item.tracks.map((track) => (
            <div className={styles.historyTrack} key={track.id}>
              <p className={styles.historyTrackTitle}>{track.title}</p>
              {track.audioUrl ? (
                <AuthenticatedAudio
                  className={styles.player}
                  src={track.audioUrl}
                />
              ) : null}
            </div>
          ))}
          {item.lyrics?.map((lyricsItem, index) => (
            <pre className={styles.lyrics} key={`${item.id}-lyrics-${index}`}>
              {lyricsItem.text}
            </pre>
          ))}
          {item.errorMessage ? (
            <p className={styles.error}>{item.errorMessage}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
