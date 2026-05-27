"use client";

import { useEffect, useRef, useState } from "react";
import { env } from "@/shared/config/env";
import {
  readMusicApiError,
  type MusicGenerateDto,
  type MusicStatusDto,
} from "@/features/music-test/parse-api-error";
import styles from "./styles/music-test.module.css";

const DEFAULT_PROMPT =
  "A short upbeat pop song about summer and friends on Russian with male vocals";
const DEFAULT_STYLE = "electro house vocal";
const DEFAULT_TITLE = "Summer Friends";
const POLL_INTERVAL_MS = 5000;

export function MusicTestPanel() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<string>("sunoapi");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [lyricsPrompt, setLyricsPrompt] = useState(
    "A song about summer, friendship and freedom",
  );
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<MusicStatusDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void fetch(`${env.apiUrl}/api/music/test/status`)
      .then((response) => response.json())
      .then((body: { configured?: boolean; provider?: string }) => {
        setConfigured(Boolean(body.configured));
        setProvider(body.provider ?? "sunoapi");
      })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(
    () => () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    },
    [],
  );

  async function pollStatus(id: string) {
    const response = await fetch(`${env.apiUrl}/api/music/status/${id}`);

    if (!response.ok) {
      throw new Error(await readMusicApiError(response));
    }

    const body = (await response.json()) as MusicStatusDto;
    setStatus(body);

    if (body.status === "completed" || body.status === "failed") {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      if (body.status === "failed") {
        setError(body.errorMessage ?? "Music generation failed");
      }
    }
  }

  function startPolling(id: string) {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    void pollStatus(id).catch((pollError) => {
      setError(
        pollError instanceof Error ? pollError.message : "Status polling failed",
      );
    });

    pollTimerRef.current = setInterval(() => {
      void pollStatus(id).catch((pollError) => {
        setError(
          pollError instanceof Error ? pollError.message : "Status polling failed",
        );
      });
    }, POLL_INTERVAL_MS);
  }

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);
    setStatus(null);

    try {
      const response = await fetch(`${env.apiUrl}/api/music/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style,
          title,
          customMode: true,
          instrumental: false,
        }),
      });

      if (!response.ok) {
        throw new Error(await readMusicApiError(response));
      }

      const body = (await response.json()) as MusicGenerateDto;
      setTaskId(body.taskId);
      setStatus({
        taskId: body.taskId,
        status: "pending",
        provider: body.provider,
      });
      startPolling(body.taskId);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Generate failed",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleLyricsTest() {
    setError(null);
    setIsLyricsLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`${env.apiUrl}/api/music/lyrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: lyricsPrompt }),
      });

      if (!response.ok) {
        throw new Error(await readMusicApiError(response));
      }

      const body = (await response.json()) as MusicGenerateDto;
      setTaskId(body.taskId);
      startPolling(body.taskId);
    } catch (lyricsError) {
      setError(
        lyricsError instanceof Error ? lyricsError.message : "Lyrics test failed",
      );
    } finally {
      setIsLyricsLoading(false);
    }
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>Music API Test (Suno)</h1>
      <p className={styles.description}>
        Генерация музыки через abstraction layer (`MUSIC_PROVIDER={provider}`).
        Voice transfer остаётся на Kits.
      </p>

      {configured === false ? (
        <p className={styles.warning}>
          SUNO_API_KEY не настроен. Добавьте ключ в .env и перезапустите API.
        </p>
      ) : null}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>1. Generate Song</h2>
        <label className={styles.field}>
          <span className={styles.label}>Prompt</span>
          <textarea
            className={styles.textarea}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
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
        <button
          className={styles.submit}
          type="button"
          disabled={isGenerating || configured === false}
          onClick={() => void handleGenerate()}
        >
          {isGenerating ? "Запуск..." : "Тест Generate"}
        </button>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>2. Generate Lyrics</h2>
        <label className={styles.field}>
          <span className={styles.label}>Prompt</span>
          <textarea
            className={styles.textarea}
            value={lyricsPrompt}
            onChange={(event) => setLyricsPrompt(event.target.value)}
          />
        </label>
        <button
          className={styles.submit}
          type="button"
          disabled={isLyricsLoading || configured === false}
          onClick={() => void handleLyricsTest()}
        >
          {isLyricsLoading ? "Запуск..." : "Тест Lyrics"}
        </button>
      </div>

      {taskId ? (
        <p className={styles.meta}>
          taskId={taskId}, status={status?.status ?? "pending"}
        </p>
      ) : null}

      {status?.tracks?.map((track) => (
        <div className={styles.card} key={track.id}>
          <h3 className={styles.cardTitle}>{track.title}</h3>
          {track.lyricsText ? (
            <pre className={styles.lyrics}>{track.lyricsText}</pre>
          ) : null}
          {track.audioUrl ? (
            <audio className={styles.player} controls src={track.audioUrl} />
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
    </section>
  );
}
