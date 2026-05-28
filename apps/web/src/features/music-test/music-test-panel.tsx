"use client";

import { ApiError } from "@ai-music/api-client";
import type { MusicStatusResponseDto } from "@ai-music/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CollapsibleLyrics } from "@/features/music-test/collapsible-lyrics";
import { MusicHistoryPanel } from "@/features/music-test/music-history-panel";
import { SongTrackResult } from "@/features/music-test/song-track-result";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import styles from "./styles/music-test.module.css";

const DEFAULT_PROMPT =
  "Upbeat pop song about summer and friends, male vocals in Russian";
const DEFAULT_STYLE = "electro house vocal";
const DEFAULT_TITLE = "Summer Friends";
const POLL_INTERVAL_MS = 12_000;

const DURATION_OPTIONS = [
  { value: 0, label: "Auto (~2–3 мин)" },
  { value: 30, label: "~30 сек" },
  { value: 60, label: "~1 мин" },
  { value: 120, label: "~2 мин" },
] as const;

type ActiveGenerationKind = "song" | "text" | null;

const RAW_STATUS_LABELS: Record<string, string> = {
  PENDING: "В очереди у Suno",
  GENERATING: "Генерация",
  TEXT_SUCCESS: "Текст готов",
  FIRST_SUCCESS: "Первый трек готов",
  SUCCESS: "Готово",
};

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

  return "Music API error";
}

export function MusicTestPanel() {
  const api = useApi();
  const authReady = useAuthReady();
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState("sunoapi");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [lyricsPrompt, setLyricsPrompt] = useState(
    "A song about summer, friendship and freedom",
  );
  const [activeKind, setActiveKind] = useState<ActiveGenerationKind>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<MusicStatusResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [isDeletingTrack, setIsDeletingTrack] = useState(false);
  const [isOpeningEditor, setIsOpeningEditor] = useState(false);
  const [openingEditorTrackId, setOpeningEditorTrackId] = useState<string | null>(
    null,
  );
  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const historyQuery = useQuery({
    queryKey: ["music-history"],
    queryFn: () => api.music.history(),
    enabled: authReady,
  });

  useEffect(() => {
    void api.music
      .getTestStatus()
      .then((body) => {
        setConfigured(Boolean(body.configured));
        setProvider(body.provider ?? "sunoapi");
      })
      .catch(() => setConfigured(false));
  }, [api]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(
    () => () => {
      stopPolling();
    },
    [stopPolling],
  );

  const refreshHistory = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["music-history"] });
  }, [queryClient]);

  const pollStatus = useCallback(
    async (id: string) => {
      const body = await api.music.status(id);
      setStatus(body);

      if (body.status === "completed" || body.status === "failed") {
        stopPolling();
        await refreshHistory();

        if (body.status === "failed") {
          setError(body.errorMessage ?? "Music generation failed");
        }
      }
    },
    [api, refreshHistory, stopPolling],
  );

  const startPolling = useCallback(
    (id: string, kind: ActiveGenerationKind) => {
      stopPolling();
      setActiveKind(kind);
      setIsPolling(true);
      setError(null);

      void pollStatus(id).catch((pollError) => {
        setError(resolveErrorMessage(pollError));
        stopPolling();
      });

      pollTimerRef.current = setInterval(() => {
        void pollStatus(id).catch((pollError) => {
          setError(resolveErrorMessage(pollError));
          stopPolling();
        });
      }, POLL_INTERVAL_MS);
    },
    [pollStatus, stopPolling],
  );

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);
    setStatus(null);
    setTaskId(null);
    setActiveKind(null);

    try {
      const body = await api.music.generate({
        prompt,
        style: customMode ? style : undefined,
        title: customMode ? title : undefined,
        customMode,
        instrumental: false,
        durationSec: durationSec > 0 ? durationSec : undefined,
      });

      setTaskId(body.taskId);
      setStatus({
        recordId: body.recordId,
        taskId: body.taskId,
        status: "pending",
        provider: body.provider,
        rawStatus: "PENDING",
      });
      startPolling(body.taskId, "song");
    } catch (generateError) {
      setError(resolveErrorMessage(generateError));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleLyricsTest() {
    setError(null);
    setIsLyricsLoading(true);
    setStatus(null);
    setTaskId(null);
    setActiveKind(null);

    try {
      const body = await api.music.lyrics(lyricsPrompt);
      setTaskId(body.taskId);
      startPolling(body.taskId, "text");
    } catch (lyricsError) {
      setError(resolveErrorMessage(lyricsError));
    } finally {
      setIsLyricsLoading(false);
    }
  }

  async function handleDeleteHistory(ids: string[]) {
    setIsDeletingHistory(true);
    setError(null);

    try {
      await api.music.deleteHistory(ids);
      await refreshHistory();
    } catch (deleteError) {
      setError(resolveErrorMessage(deleteError));
    } finally {
      setIsDeletingHistory(false);
    }
  }

  async function handleOpenEditor(trackId: string) {
    setIsOpeningEditor(true);
    setOpeningEditorTrackId(trackId);
    setError(null);

    try {
      const result = await api.musicEditor.initEditor(trackId);
      router.push(`/music-editor/${result.songId}`);
    } catch (editorError) {
      setError(resolveErrorMessage(editorError));
    } finally {
      setIsOpeningEditor(false);
      setOpeningEditorTrackId(null);
    }
  }

  async function handleDeleteTrack(trackId: string) {
    setIsDeletingTrack(true);
    setError(null);

    try {
      await api.music.deleteTrack(trackId);
      setStatus((current) =>
        current
          ? {
              ...current,
              tracks: current.tracks?.filter((track) => track.id !== trackId),
            }
          : current,
      );
      await refreshHistory();
    } catch (deleteError) {
      setError(resolveErrorMessage(deleteError));
    } finally {
      setIsDeletingTrack(false);
    }
  }

  const isBusy = isGenerating || isLyricsLoading || isPolling;
  const rawStatusLabel = status?.rawStatus
    ? (RAW_STATUS_LABELS[status.rawStatus] ?? status.rawStatus)
    : null;
  const songTracks = activeKind === "song" ? (status?.tracks ?? []) : [];
  const textResults = activeKind === "text" ? (status?.lyrics ?? []) : [];

  if (!authReady) {
    return <p className={styles.meta}>Загрузка сессии...</p>;
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Magic Music</h1>
      <p className={styles.description}>
        Генерация музыки через abstraction layer (`MUSIC_PROVIDER={provider}`).
        Результаты сохраняются в вашей истории.
      </p>

      {configured === false ? (
        <p className={styles.warning}>
          SUNO_API_KEY не настроен. Добавьте ключ в .env и перезапустите API.
        </p>
      ) : null}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Generate Song</h2>
        <label className={styles.checkboxField}>
          <input
            checked={customMode}
            type="checkbox"
            onChange={(event) => setCustomMode(event.target.checked)}
          />
          <span className={styles.label}>
            Custom mode (prompt = текст песни, нужны style и title)
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>
            {customMode ? "Lyrics (текст песни)" : "Prompt (описание идеи)"}
          </span>
          <textarea
            className={styles.textarea}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        {customMode ? (
          <>
            <label className={styles.field}>
              <span className={styles.label}>Style</span>
              <input
                className={styles.input}
                value={style}
                onChange={(event) => setStyle(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Title</span>
              <input
                className={styles.input}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
          </>
        ) : null}
        <label className={styles.field}>
          <span className={styles.label}>Target duration</span>
          <select
            className={styles.select}
            value={durationSec}
            onChange={(event) => setDurationSec(Number(event.target.value))}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {durationSec > 0 ? (
          <p className={styles.meta}>
            Suno не гарантирует точную длительность — значение добавляется в
            prompt/style как подсказка модели. Для ~30 сек лучше короткий prompt
            и без длинного текста в custom mode.
          </p>
        ) : null}
        <button
          className={styles.submit}
          type="button"
          disabled={isBusy || configured === false}
          onClick={() => void handleGenerate()}
        >
          {isGenerating ? "Запуск..." : "Generate Song"}
        </button>

        {activeKind === "song" && isPolling ? (
          <div className={styles.progressCard}>
            <p className={styles.progressTitle}>Генерация...</p>
            <p className={styles.progressHint}>
              Обычно занимает 2–3 минуты. Не закрывайте страницу.
            </p>
            {rawStatusLabel ? (
              <p className={styles.meta}>
                Статус: {rawStatusLabel}
                {taskId ? ` · taskId=${taskId}` : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        {songTracks.map((track) =>
          track.audioUrl ? (
            <SongTrackResult
              key={track.id}
              audioUrl={track.audioUrl}
              canDelete={Boolean(track.canDelete)}
              durationSec={track.durationSec}
              isDeleting={isDeletingTrack}
              isOpeningEditor={
                isOpeningEditor && openingEditorTrackId === track.id
              }
              lyricsText={track.lyricsText}
              title={track.title}
              trackId={track.id}
              onDelete={() => void handleDeleteTrack(track.id)}
              onOpenEditor={(id) => void handleOpenEditor(id)}
            />
          ) : null,
        )}

        {activeKind === "song" && taskId && !isPolling ? (
          <p className={styles.meta}>
            taskId={taskId}, status={status?.status ?? "pending"}
            {status?.rawStatus ? `, raw=${status.rawStatus}` : ""}
          </p>
        ) : null}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Generate text for music track</h2>
        <label className={styles.field}>
          <span className={styles.label}>Prompt (описание темы текста)</span>
          <textarea
            className={styles.textarea}
            value={lyricsPrompt}
            onChange={(event) => setLyricsPrompt(event.target.value)}
          />
        </label>
        <button
          className={styles.submit}
          type="button"
          disabled={isBusy || configured === false}
          onClick={() => void handleLyricsTest()}
        >
          {isLyricsLoading ? "Запуск..." : "Generate text"}
        </button>

        {activeKind === "text" && isPolling ? (
          <div className={styles.progressCard}>
            <p className={styles.progressTitle}>Генерация текста...</p>
            {rawStatusLabel ? (
              <p className={styles.meta}>
                Статус: {rawStatusLabel}
                {taskId ? ` · taskId=${taskId}` : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        {textResults.map((item, index) => (
          <div className={styles.textResult} key={`${item.title}-${index}`}>
            <h3 className={styles.resultSubtitle}>{item.title}</h3>
            <CollapsibleLyrics text={item.text} />
          </div>
        ))}

        {activeKind === "text" && taskId && !isPolling ? (
          <p className={styles.meta}>
            taskId={taskId}, status={status?.status ?? "pending"}
            {status?.rawStatus ? `, raw=${status.rawStatus}` : ""}
          </p>
        ) : null}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>История генераций</h2>
        <MusicHistoryPanel
          isDeleting={isDeletingHistory || isDeletingTrack}
          isLoading={historyQuery.isLoading}
          items={historyQuery.data ?? []}
          openingEditorTrackId={openingEditorTrackId}
          onDelete={handleDeleteHistory}
          onDeleteTrack={handleDeleteTrack}
          onOpenEditor={(id) => void handleOpenEditor(id)}
        />
      </div>
    </section>
  );
}
