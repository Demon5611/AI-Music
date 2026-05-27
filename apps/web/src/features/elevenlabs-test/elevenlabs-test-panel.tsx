"use client";

import { useEffect, useState } from "react";
import { env } from "@/shared/config/env";
import {
  readElevenLabsApiError,
  readResponseMeta,
} from "@/features/elevenlabs-test/parse-api-error";
import styles from "./styles/elevenlabs-test.module.css";

const DEFAULT_TTS_TEXT =
  "Привет! Это тест ElevenLabs Text to Speech API на Free plan.";

export function ElevenLabsTestPanel() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [ttsText, setTtsText] = useState(DEFAULT_TTS_TEXT);
  const [musicPrompt, setMusicPrompt] = useState(
    "A short upbeat pop song about summer and friends",
  );
  const [musicStyle, setMusicStyle] = useState("pop");
  const [musicDurationSec, setMusicDurationSec] = useState("30");
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [musicAudioUrl, setMusicAudioUrl] = useState<string | null>(null);
  const [ttsMeta, setTtsMeta] = useState<string | null>(null);
  const [musicMeta, setMusicMeta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isMusicLoading, setIsMusicLoading] = useState(false);

  useEffect(() => {
    void fetch(`${env.apiUrl}/api/elevenlabs/test/status`)
      .then((response) => response.json())
      .then((body: { configured?: boolean }) => {
        setConfigured(Boolean(body.configured));
      })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(
    () => () => {
      if (ttsAudioUrl) {
        URL.revokeObjectURL(ttsAudioUrl);
      }

      if (musicAudioUrl) {
        URL.revokeObjectURL(musicAudioUrl);
      }
    },
    [ttsAudioUrl, musicAudioUrl],
  );

  async function handleTtsTest() {
    setError(null);
    setIsTtsLoading(true);

    if (ttsAudioUrl) {
      URL.revokeObjectURL(ttsAudioUrl);
      setTtsAudioUrl(null);
    }

    try {
      const response = await fetch(`${env.apiUrl}/api/elevenlabs/test/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText }),
      });

      if (!response.ok) {
        throw new Error(await readElevenLabsApiError(response));
      }

      const blob = await response.blob();
      const meta = readResponseMeta(response);
      setTtsAudioUrl(URL.createObjectURL(blob));
      setTtsMeta(
        `kind=${meta.kind}, bytes=${meta.byteLength}`,
      );
    } catch (testError) {
      setError(
        testError instanceof Error ? testError.message : "TTS test failed",
      );
    } finally {
      setIsTtsLoading(false);
    }
  }

  async function handleMusicTest() {
    setError(null);
    setIsMusicLoading(true);

    if (musicAudioUrl) {
      URL.revokeObjectURL(musicAudioUrl);
      setMusicAudioUrl(null);
    }

    try {
      const response = await fetch(`${env.apiUrl}/api/elevenlabs/test/music`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: musicPrompt,
          style: musicStyle,
          durationSec: Number(musicDurationSec),
        }),
      });

      if (!response.ok) {
        throw new Error(await readElevenLabsApiError(response));
      }

      const blob = await response.blob();
      const meta = readResponseMeta(response);
      setMusicAudioUrl(URL.createObjectURL(blob));
      setMusicMeta(
        `kind=${meta.kind}, bytes=${meta.byteLength}, songId=${meta.providerJobId || "n/a"}`,
      );
    } catch (testError) {
      setError(
        testError instanceof Error ? testError.message : "Music test failed",
      );
    } finally {
      setIsMusicLoading(false);
    }
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>ElevenLabs API Test</h1>
      <p className={styles.description}>
        Проверка Free plan: TTS (ключ живой) и Music compose (может вернуть 402/403
        без Starter). Ключ остаётся на backend.
      </p>

      {configured === false ? (
        <p className={styles.warning}>
          ELEVENLABS_API_KEY не настроен в API (.env). Добавьте ключ и перезапустите
          `pnpm dev:api`.
        </p>
      ) : null}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>1. Text to Speech</h2>
        <p className={styles.hint}>
          Короткий запрос — ~десятки символов, подходит для Free.
        </p>
        <label className={styles.field}>
          <span className={styles.label}>Текст</span>
          <textarea
            className={styles.textarea}
            value={ttsText}
            onChange={(event) => setTtsText(event.target.value)}
          />
        </label>
        <button
          className={styles.submit}
          type="button"
          disabled={isTtsLoading || configured === false}
          onClick={() => void handleTtsTest()}
        >
          {isTtsLoading ? "Генерация..." : "Тест TTS"}
        </button>
        {ttsMeta ? <p className={styles.meta}>{ttsMeta}</p> : null}
        {ttsAudioUrl ? (
          <audio className={styles.player} controls src={ttsAudioUrl} />
        ) : null}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>2. Music Generation</h2>
        <p className={styles.hint}>
          Music API может требовать paid plan. Для экономии credits — 30 сек.
        </p>
        <label className={styles.field}>
          <span className={styles.label}>Prompt</span>
          <textarea
            className={styles.textarea}
            value={musicPrompt}
            onChange={(event) => setMusicPrompt(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Style</span>
          <input
            className={styles.input}
            value={musicStyle}
            onChange={(event) => setMusicStyle(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Duration (sec)</span>
          <input
            className={styles.input}
            type="number"
            min={3}
            max={300}
            value={musicDurationSec}
            onChange={(event) => setMusicDurationSec(event.target.value)}
          />
        </label>
        <button
          className={styles.submit}
          type="button"
          disabled={isMusicLoading || configured === false}
          onClick={() => void handleMusicTest()}
        >
          {isMusicLoading ? "Генерация (до 3 мин)..." : "Тест Music"}
        </button>
        {musicMeta ? <p className={styles.meta}>{musicMeta}</p> : null}
        {musicAudioUrl ? (
          <audio className={styles.player} controls src={musicAudioUrl} />
        ) : null}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
