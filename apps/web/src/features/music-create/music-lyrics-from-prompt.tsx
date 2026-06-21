"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import type { MusicLyricsStatusResponseDto } from "@ai-music/shared";
import {
  checkContentAllowed,
  isVocalGender,
  resolveLyricsBriefMaxLength,
  truncateLyricsForDuration,
  VOCAL_GENDER_LABELS,
} from "@ai-music/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePollingQuery } from "@/shared/hooks/use-polling-query";
import { AiProcessingStatus } from "@/shared/ui/elevenlabs/ai-processing-status";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { mc } from "@/features/music-create/music-create-classes";
import { CharCounter } from "@/features/music-create/components/music-create-icons";
import { DisabledTooltipWrap } from "@/shared/ui/tooltip";
import { cn } from "@/lib/utils";

const LYRICS_POLL_INTERVAL_MS = 5_000;

interface MusicLyricsFromPromptProps {
  configured: boolean;
  disabled?: boolean;
  lockedHint?: string;
  lyricsBrief: string;
  lyricsDurationHint: string;
  lyricsDurationSec: number;
  onLyricsBriefChange: (value: string) => void;
  onApply: (text: string, suggestedTitle?: string) => void;
}

function isLyricsStatusTerminal(data: MusicLyricsStatusResponseDto | undefined): boolean {
  return !data || data.status === "completed" || data.status === "failed";
}

function resolvePollError(
  queryError: Error | null,
  data: MusicLyricsStatusResponseDto | undefined,
): string | null {
  if (queryError) {
    return parseApiError(queryError, "Не удалось сгенерировать текст");
  }

  if (!data || data.status === "pending" || data.status === "processing") {
    return null;
  }

  if (data.status === "failed") {
    return data.errorMessage ?? "Генерация текста не удалась";
  }

  if ((data.lyrics ?? []).length === 0) {
    return "AI не вернул текст песни";
  }

  return null;
}

export function MusicLyricsFromPrompt({
  configured,
  disabled = false,
  lockedHint,
  lyricsBrief,
  lyricsDurationHint,
  lyricsDurationSec,
  onLyricsBriefChange,
  onApply,
}: MusicLyricsFromPromptProps) {
  const api = useApi();
  const authReady = useAuthReady();
  const userQuery = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => api.users.getMe(),
    enabled: authReady,
  });
  const vocalGender = useMemo(() => {
    const gender = userQuery.data?.vocalGender;
    return gender && isVocalGender(gender) ? gender : null;
  }, [userQuery.data?.vocalGender]);
  const briefMaxLength = resolveLyricsBriefMaxLength(vocalGender, lyricsDurationSec);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lyricsTaskId, setLyricsTaskId] = useState<string | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const appliedCompletionRef = useRef<string | null>(null);

  const applyVariant = useCallback(
    (items: Array<{ title: string; text: string }>, index: number) => {
      const variant = items[index];
      if (!variant) {
        return;
      }

      setSelectedVariantIndex(index);
      onApply(
        truncateLyricsForDuration(variant.text, lyricsDurationSec),
        variant.title,
      );
    },
    [lyricsDurationSec, onApply],
  );

  const lyricsStatusQuery = usePollingQuery({
    queryKey: ["music-lyrics-status", lyricsTaskId, lyricsDurationSec],
    queryFn: () => api.music.lyricsStatus(lyricsTaskId!, lyricsDurationSec),
    enabled: Boolean(lyricsTaskId),
    isTerminal: isLyricsStatusTerminal,
    intervalMs: LYRICS_POLL_INTERVAL_MS,
  });

  const pollError = resolvePollError(
    lyricsStatusQuery.error,
    lyricsStatusQuery.data,
  );
  const displayError = submitError ?? pollError;

  const variants = useMemo(() => {
    const body = lyricsStatusQuery.data;
    if (!lyricsTaskId || !body || body.status !== "completed") {
      return [];
    }

    return body.lyrics ?? [];
  }, [lyricsTaskId, lyricsStatusQuery.data]);

  useEffect(() => {
    const body = lyricsStatusQuery.data;
    if (!lyricsTaskId || !body || body.status !== "completed") {
      return;
    }

    const items = body.lyrics ?? [];
    if (items.length === 0) {
      return;
    }

    const completionKey = `${lyricsTaskId}:${body.taskId}`;
    if (appliedCompletionRef.current === completionKey) {
      return;
    }

    appliedCompletionRef.current = completionKey;
    const firstVariant = items[0];
    onApply(
      truncateLyricsForDuration(firstVariant.text, lyricsDurationSec),
      firstVariant.title,
    );
  }, [lyricsDurationSec, lyricsStatusQuery.data, lyricsTaskId, onApply]);

  async function handleGenerate() {
    const prompt = lyricsBrief.trim();

    if (!prompt) {
      setSubmitError("Введите описание текста");
      return;
    }

    const moderationResult = checkContentAllowed(prompt);
    if (!moderationResult.allowed) {
      setSubmitError(moderationResult.reasonMessageRu);
      return;
    }

    setSubmitError(null);
    setIsGenerating(true);
    setSelectedVariantIndex(0);
    appliedCompletionRef.current = null;

    try {
      const body = await api.music.generateLyrics({
        prompt,
        durationSec: lyricsDurationSec,
      });
      setLyricsTaskId(body.taskId);
    } catch (generateError) {
      setSubmitError(parseApiError(generateError, "Не удалось сгенерировать текст"));
    } finally {
      setIsGenerating(false);
    }
  }

  const isPolling =
    Boolean(lyricsTaskId) &&
    !lyricsStatusQuery.error &&
    !isLyricsStatusTerminal(lyricsStatusQuery.data);
  const isBusy = isGenerating || isPolling;
  const lockedByManualLyrics = disabled && !isBusy;
  const fieldDisabled = isBusy || disabled;
  const canGenerate = configured && !fieldDisabled && lyricsBrief.trim().length > 0;
  const durationHint = lyricsDurationHint;
  const genderHint = vocalGender
    ? `Пол голоса: ${VOCAL_GENDER_LABELS[vocalGender]} — зафиксирован при записи образца и верификации.`
    : "Пол голоса не указан — задайте его при записи образца на главной, чтобы AI подбирал род глаголов.";

  const briefTextarea = (
    <textarea
      aria-describedby={lockedByManualLyrics && lockedHint ? "prompt-lyrics-locked-hint" : undefined}
      className={cn(mc.textarea, "h-20", fieldDisabled && !isBusy && mc.fieldDisabled)}
      disabled={fieldDisabled}
      maxLength={briefMaxLength}
      placeholder="Например: грустная баллада о расставании, первое лицо, русский язык"
      value={lyricsBrief}
      onChange={(event) => onLyricsBriefChange(event.target.value)}
    />
  );

  return (
    <div className={mc.lyricsBlock}>
      <label className="block">
        <span className={mc.lyricsPromptLabel}>
          Введите примерное описание текста и AI на базе промта создаст текст песни
        </span>
        <div className="relative mt-2">
          {lockedByManualLyrics && lockedHint ? (
            <DisabledTooltipWrap block content={lockedHint} wide>
              <div className="w-full">{briefTextarea}</div>
            </DisabledTooltipWrap>
          ) : (
            briefTextarea
          )}
          <div className={mc.counterPos}>
            <CharCounter current={lyricsBrief.length} max={briefMaxLength} />
          </div>
        </div>
        {lockedByManualLyrics && lockedHint ? (
          <p className={cn(mc.meta, "mt-2")} id="prompt-lyrics-locked-hint">
            {lockedHint}
          </p>
        ) : null}
        <p className={cn(mc.meta, "mt-2")}>{durationHint}</p>
        <p className={cn(mc.meta, "mt-1")}>{genderHint}</p>
      </label>

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

      {displayError ? <p className={cn(mc.errorInline, "mt-2")}>{displayError}</p> : null}
    </div>
  );
}
