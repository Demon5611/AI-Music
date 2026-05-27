"use client";

import { ApiError } from "@ai-music/api-client";
import type { MusicStatusResponseDto } from "@ai-music/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { MusicHistoryPanel } from "@/features/music-test/music-history-panel";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { AuthenticatedAudio } from "@/shared/ui/authenticated-audio";
import styles from "./styles/music-test.module.css";

const DEFAULT_PROMPT =
  "Upbeat pop song about summer and friends, male vocals in Russian";
const DEFAULT_STYLE = "electro house vocal";
const DEFAULT_TITLE = "Summer Friends";
const POLL_INTERVAL_MS = 12_000;

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
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [lyricsPrompt, setLyricsPrompt] = useState(
    "A song about summer, friendship and freedom",
  );
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<MusicStatusResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  async function handleLyricsTest() {
    setError(null);
    setIsLyricsLoading(true);
    setStatus(null);
    setTaskId(null);

    try {
      const body = await api.music.lyrics(lyricsPrompt);
      setTaskId(body.taskId);
      startPolling(body.taskId);
    } catch (lyricsError) {
      setError(resolveErrorMessage(lyricsError));
    } finally {
      setIsLyricsLoading(false);
    }
  }

  const isBusy = isGenerating || isLyricsLoading || isPolling;
  const rawStatusLabel = status?.rawStatus
    ? (RAW_STATUS_LABELS[status.rawStatus] ?? status.rawStatus)
    : null;

  if (!authReady) {
    return <p className={styles.meta}>Загрузка сессии...</p>;
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Music API Test (Suno)</h1>
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
        <h2 className={styles.cardTitle}>1. Generate Song</h2>
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
        <button
          className={styles.submit}
          type="button"
          disabled={isBusy || configured === false}
          onClick={() => void handleGenerate()}
        >
          {isGenerating ? "Запуск..." : "Тест Generate"}
        </button>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>2. Generate text for music track</h2>
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
      </div>

      {isPolling ? (
        <div className={styles.progressCard}>
          <p className={styles.progressTitle}>Генерация...</p>
          <p className={styles.progressHint}>
            Обычно занимает 2–3 минуты. Не закрывайте страницу.
          </p>
          {rawStatusLabel ? (
            <p className={styles.meta}>
              Статус Suno: {rawStatusLabel}
              {taskId ? ` · taskId=${taskId}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {taskId && !isPolling ? (
        <p className={styles.meta}>
          taskId={taskId}, status={status?.status ?? "pending"}
          {status?.rawStatus ? `, raw=${status.rawStatus}` : ""}
        </p>
      ) : null}

      {status?.tracks?.map((track) => (
        <div className={styles.card} key={track.id}>
          <h3 className={styles.cardTitle}>{track.title}</h3>
          {track.lyricsText ? (
            <pre className={styles.lyrics}>{track.lyricsText}</pre>
          ) : null}
          {track.audioUrl ? (
            <AuthenticatedAudio className={styles.player} src={track.audioUrl} />
          ) : null}
        </div>
      ))}

      {status?.lyrics?.map((item, index) => (
        <div className={styles.card} key={`${item.title}-${index}`}>
          <h3 className={styles.cardTitle}>{item.title}</h3>
          <pre className={styles.lyrics}>{item.text}</pre>
        </div>
      ))}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>История генераций</h2>
        <MusicHistoryPanel
          isLoading={historyQuery.isLoading}
          items={historyQuery.data ?? []}
        />
      </div>
    </section>
  );
}
