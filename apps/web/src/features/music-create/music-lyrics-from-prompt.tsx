"use client";

import { ApiError } from "@ai-music/api-client";
import type { MusicLyricsStatusResponseDto } from "@ai-music/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiProcessingStatus } from "@/shared/ui/elevenlabs/ai-processing-status";
import { useApi } from "@/shared/providers/api-provider";
import { mt } from "./music-create-classes";
import { cn } from "@/lib/utils";

const LYRICS_BRIEF_MAX_LENGTH = 200;
const LYRICS_POLL_INTERVAL_MS = 5_000;

interface MusicLyricsFromPromptProps {
  configured: boolean;
  disabled?: boolean;
  lyricsBrief: string;
  onLyricsBriefChange: (value: string) => void;
  onApply: (text: string, suggestedTitle?: string) => void;
}

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

  return "Не удалось сгенерировать текст";
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const isNearLimit = current / max > 0.9;

  return (
    <span className={isNearLimit ? mt.charCounterLimit : mt.charCounter}>
      {current}/{max}
    </span>
  );
}

export function MusicLyricsFromPrompt({
  configured,
  disabled = false,
  lyricsBrief,
  onLyricsBriefChange,
  onApply,
}: MusicLyricsFromPromptProps) {
  const api = useApi();
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [variants, setVariants] = useState<Array<{ title: string; text: string }>>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const applyVariant = useCallback(
    (items: Array<{ title: string; text: string }>, index: number) => {
      const variant = items[index];
      if (!variant) {
        return;
      }

      setSelectedVariantIndex(index);
      onApply(variant.text, variant.title);
    },
    [onApply],
  );

  const handleCompleted = useCallback(
    (body: MusicLyricsStatusResponseDto) => {
      const items = body.lyrics ?? [];

      if (items.length === 0) {
        setError("AI не вернул текст песни");
        return;
      }

      setVariants(items);
      applyVariant(items, 0);
    },
    [applyVariant],
  );

  const pollStatus = useCallback(
    async (taskId: string) => {
      const body = await api.music.lyricsStatus(taskId);

      if (body.status === "completed") {
        stopPolling();
        handleCompleted(body);
        return;
      }

      if (body.status === "failed") {
        stopPolling();
        setError(body.errorMessage ?? "Генерация текста не удалась");
      }
    },
    [api, handleCompleted, stopPolling],
  );

  const startPolling = useCallback(
    (taskId: string) => {
      stopPolling();
      setIsPolling(true);
      setError(null);
      setVariants([]);

      void pollStatus(taskId).catch((pollError) => {
        setError(resolveErrorMessage(pollError));
        stopPolling();
      });

      pollTimerRef.current = setInterval(() => {
        void pollStatus(taskId).catch((pollError) => {
          setError(resolveErrorMessage(pollError));
          stopPolling();
        });
      }, LYRICS_POLL_INTERVAL_MS);
    },
    [pollStatus, stopPolling],
  );

  async function handleGenerate() {
    const prompt = lyricsBrief.trim();

    if (!prompt) {
      setError("Введите описание текста");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setVariants([]);

    try {
      const body = await api.music.generateLyrics({ prompt });
      startPolling(body.taskId);
    } catch (generateError) {
      setError(resolveErrorMessage(generateError));
    } finally {
      setIsGenerating(false);
    }
  }

  const isBusy = isGenerating || isPolling;
  const fieldDisabled = isBusy || disabled;
  const canGenerate = configured && !fieldDisabled && lyricsBrief.trim().length > 0;

  return (
    <div className={mt.lyricsBlock}>
      <label className="block">
        <span className={mt.lyricsPromptLabel}>
          Введите примерное описание текста и AI на базе промта создаст текст песни
        </span>
        <div className="relative mt-2">
          <textarea
            className={cn(mt.textarea, "h-20", fieldDisabled && !isBusy && mt.fieldDisabled)}
            disabled={fieldDisabled}
            maxLength={LYRICS_BRIEF_MAX_LENGTH}
            placeholder="Например: грустная баллада о расставании, первое лицо, русский язык"
            value={lyricsBrief}
            onChange={(event) => onLyricsBriefChange(event.target.value)}
          />
          <div className={mt.counterPos}>
            <CharCounter current={lyricsBrief.length} max={LYRICS_BRIEF_MAX_LENGTH} />
          </div>
        </div>
      </label>

      {disabled && !isBusy ? (
        <p className={mt.meta}>Очистите текст песни ниже, чтобы описать идею для AI.</p>
      ) : null}

      <button
        className={cn(mt.secondaryButton, "mt-3")}
        disabled={!canGenerate}
        type="button"
        onClick={() => void handleGenerate()}
      >
        {isGenerating ? "Запуск..." : isPolling ? "Генерация..." : "Сгенерировать текст"}
      </button>

      {isPolling ? (
        <div className="mt-3">
          <AiProcessingStatus agentState="thinking" label="AI пишет текст песни..." />
        </div>
      ) : null}

      {variants.length > 1 ? (
        <div className={cn(mt.lyricsVariants, "mt-3")}>
          <span className={mt.meta}>Выберите вариант:</span>
          <div className={mt.lyricsVariantList}>
            {variants.map((variant, index) => (
              <button
                key={`${variant.title}-${index}`}
                className={
                  index === selectedVariantIndex ? mt.lyricsVariantActive : mt.lyricsVariant
                }
                type="button"
                onClick={() => applyVariant(variants, index)}
              >
                {variant.title.trim() || `Вариант ${index + 1}`}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className={cn(mt.errorInline, "mt-2")}>{error}</p> : null}
    </div>
  );
}
