"use client";

import { ApiError } from "@ai-music/api-client";
import type { MusicStatusResponseDto } from "@ai-music/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MusicHistoryPanel } from "@/features/music-test/music-history-panel";
import { SongTrackResult } from "@/features/music-test/song-track-result";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import styles from "./styles/music-test.module.css";

const DEFAULT_PROMPT = "Upbeat pop song about summer and friends, male vocals in Russian";
const DEFAULT_STYLE = "electro house vocal";
const DEFAULT_TITLE = "Summer Friends";
const POLL_INTERVAL_MS = 12_000;

const PROMPT_MAX_LENGTH = 500;
const STYLE_MAX_LENGTH = 200;
const LYRICS_MAX_LENGTH = 3000;
const TITLE_MAX_LENGTH = 100;

const DURATION_OPTIONS = [
  { value: 0, label: "Auto (~2–3 мин)" },
  { value: 30, label: "~30 сек" },
  { value: 60, label: "~1 мин" },
  { value: 120, label: "~2 мин" },
] as const;

const RAW_STATUS_LABELS: Record<string, string> = {
  PENDING: "В очереди у AI",
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

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<MusicStatusResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [isDeletingTrack, setIsDeletingTrack] = useState(false);
  const [isOpeningEditor, setIsOpeningEditor] = useState(false);
  const [openingEditorTrackId, setOpeningEditorTrackId] = useState<string | null>(null);
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
    (id: string) => {
      stopPolling();
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
      startPolling(body.taskId);
    } catch (generateError) {
      setError(resolveErrorMessage(generateError));
    } finally {
      setIsGenerating(false);
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

  const isBusy = isGenerating || isPolling;
  const rawStatusLabel = status?.rawStatus
    ? (RAW_STATUS_LABELS[status.rawStatus] ?? status.rawStatus)
    : null;
  const songTracks = status?.tracks ?? [];

  if (!authReady) {
    return <p className={styles.meta}>Загрузка сессии...</p>;
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Magic Music</h1>
      <p className={styles.description}>
        Генерация музыки. Результаты сохраняются в вашей истории.
      </p>

      {configured === false ? (
        <p className={styles.warning}>
          SUNO_API_KEY не настроен. Добавьте ключ в .env и перезапустите API.
        </p>
      ) : null}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Генерация музыки</h2>

        <div className={styles.formHeader}>
          <span className={styles.formHeaderLabel}>Пользовательский режим</span>
          <label className={styles.toggle}>
            <input
              checked={customMode}
              className={styles.toggleInput}
              type="checkbox"
              onChange={(event) => setCustomMode(event.target.checked)}
            />
            <span className={styles.toggleTrack} aria-hidden="true">
              <span className={styles.toggleThumb} />
            </span>
          </label>
        </div>

        {customMode ? (
          <>
            <label className={styles.field}>
              <span className={styles.label}>Название</span>
              <input
                className={styles.input}
                maxLength={TITLE_MAX_LENGTH}
                placeholder="Введите название"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Стиль музыки</span>
              <div className={styles.textareaWrap}>
                <textarea
                  className={styles.textarea}
                  maxLength={STYLE_MAX_LENGTH}
                  placeholder="Введите стиль музыки"
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                />
                <span className={styles.charCounter}>
                  {style.length}/{STYLE_MAX_LENGTH}
                </span>
              </div>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                Текст на основе которого будет сгенерирована музыка
              </span>
              <div className={styles.textareaWrap}>
                <textarea
                  className={styles.textareaLarge}
                  maxLength={LYRICS_MAX_LENGTH}
                  placeholder="Напишите собственные тексты, или куплеты (8 строк) для лучшего результата"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
                <span className={styles.charCounter}>
                  {prompt.length}/{LYRICS_MAX_LENGTH}
                </span>
              </div>
            </label>
          </>
        ) : (
          <label className={styles.field}>
            <span className={styles.label}>
              Опишите тему, настроение и стиль — текст и музыку AI создаст автоматически
            </span>
            <div className={styles.textareaWrap}>
              <textarea
                className={styles.textareaLarge}
                maxLength={PROMPT_MAX_LENGTH}
                placeholder="Опишите стиль музыки и тему, которую вы хотите, и ИИ создаст текст песни"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
              <span className={styles.charCounter}>
                {prompt.length}/{PROMPT_MAX_LENGTH}
              </span>
            </div>
          </label>
        )}

        <label className={styles.field}>
          <span className={styles.label}>
            Длительность (AI не всегда точно соблюдает заданную длительность)
          </span>
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
            {customMode
              ? "AI не гарантирует точную длительность — подсказка добавляется в поле «Стиль музыки». Для коротких треков (~30 сек) используйте краткий стиль и короткие тексты."
              : "AI не гарантирует точную длительность — подсказка добавляется в описание песни. Для ~30 сек лучше короткое описание."}
          </p>
        ) : null}
        <button
          className={styles.submit}
          type="button"
          disabled={isBusy || configured === false}
          onClick={() => void handleGenerate()}
        >
          {isGenerating ? "Запуск..." : "Создать музыку"}
        </button>

        {isPolling ? (
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
              isOpeningEditor={isOpeningEditor && openingEditorTrackId === track.id}
              lyricsText={track.lyricsText}
              title={track.title}
              trackId={track.id}
              onDelete={() => void handleDeleteTrack(track.id)}
              onOpenEditor={(id) => void handleOpenEditor(id)}
            />
          ) : null,
        )}

        {taskId && !isPolling ? (
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
