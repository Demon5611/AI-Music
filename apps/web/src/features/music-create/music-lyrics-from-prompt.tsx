"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import type { MusicLyricsStatusResponseDto } from "@ai-music/shared";
import { useCallback, useEffect, useState } from "react";
import { usePollingQuery } from "@/shared/hooks/use-polling-query";
import { AiProcessingStatus } from "@/shared/ui/elevenlabs/ai-processing-status";
import { useApi } from "@/shared/providers/api-provider";
import { mc } from "@/features/music-create/music-create-classes";
import { CharCounter } from "@/features/music-create/components/music-create-icons";
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

function isLyricsStatusTerminal(data: MusicLyricsStatusResponseDto | undefined): boolean {
  return !data || data.status === "completed" || data.status === "failed";
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
  const [lyricsTaskId, setLyricsTaskId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Array<{ title: string; text: string }>>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

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

  const lyricsStatusQuery = usePollingQuery({
    queryKey: ["music-lyrics-status", lyricsTaskId],
    queryFn: () => api.music.lyricsStatus(lyricsTaskId!),
    enabled: Boolean(lyricsTaskId),
    isTerminal: isLyricsStatusTerminal,
    intervalMs: LYRICS_POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (lyricsStatusQuery.error) {
      setError(parseApiError(lyricsStatusQuery.error, "Не удалось сгенерировать текст"));
      setLyricsTaskId(null);
      return;
    }

    const body = lyricsStatusQuery.data;
    if (!body || body.status === "pending" || body.status === "processing") {
      return;
    }

    setLyricsTaskId(null);

    if (body.status === "failed") {
      setError(body.errorMessage ?? "Генерация текста не удалась");
      return;
    }

    const items = body.lyrics ?? [];
    if (items.length === 0) {
      setError("AI не вернул текст песни");
      return;
    }

    setVariants(items);
    applyVariant(items, 0);
  }, [lyricsStatusQuery.data, lyricsStatusQuery.error, applyVariant]);

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
      setLyricsTaskId(body.taskId);
    } catch (generateError) {
      setError(parseApiError(generateError, "Не удалось сгенерировать текст"));
    } finally {
      setIsGenerating(false);
    }
  }

  const isPolling = Boolean(lyricsTaskId);
  const isBusy = isGenerating || isPolling;
  const fieldDisabled = isBusy || disabled;
  const canGenerate = configured && !fieldDisabled && lyricsBrief.trim().length > 0;

  return (
    <div className={mc.lyricsBlock}>
      <label className="block">
        <span className={mc.lyricsPromptLabel}>
          Введите примерное описание текста и AI на базе промта создаст текст песни
        </span>
        <div className="relative mt-2">
          <textarea
            className={cn(mc.textarea, "h-20", fieldDisabled && !isBusy && mc.fieldDisabled)}
            disabled={fieldDisabled}
            maxLength={LYRICS_BRIEF_MAX_LENGTH}
            placeholder="Например: грустная баллада о расставании, первое лицо, русский язык"
            value={lyricsBrief}
            onChange={(event) => onLyricsBriefChange(event.target.value)}
          />
          <div className={mc.counterPos}>
            <CharCounter current={lyricsBrief.length} max={LYRICS_BRIEF_MAX_LENGTH} />
          </div>
        </div>
      </label>

      {disabled && !isBusy ? (
        <p className={mc.meta}>Очистите текст песни ниже, чтобы описать идею для AI.</p>
      ) : null}

      <button
        className={cn(mc.secondaryButton, "mt-3")}
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
        <div className={cn(mc.lyricsVariants, "mt-3")}>
          <span className={mc.meta}>Выберите вариант:</span>
          <div className={mc.lyricsVariantList}>
            {variants.map((variant, index) => (
              <button
                key={`${variant.title}-${index}`}
                className={
                  index === selectedVariantIndex ? mc.lyricsVariantActive : mc.lyricsVariant
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

      {error ? <p className={cn(mc.errorInline, "mt-2")}>{error}</p> : null}
    </div>
  );
}
