"use client";

import { useSubscriptionQuery } from "@/features/billing/hooks/use-subscription-query";
import { mc } from "@/features/music-create/music-create-classes";
import { MusicLyricsFromPrompt } from "@/features/music-create/music-lyrics-from-prompt";
import {
  CharCounter,
  IconChevronRight,
} from "@/features/music-create/components/music-create-icons";
import { cn } from "@/lib/utils";
import {
  checkContentAllowed,
  FREE_TIER_DEFAULT_DURATION_SEC,
  resolveLyricsDurationSecForPlan,
  resolveManualLyricsMaxLength,
} from "@ai-music/shared";
import { DisabledTooltipWrap } from "@/shared/ui/tooltip";

const MANUAL_LYRICS_LOCKED_HINT =
  "Сначала очистите описание выше или нажмите «Сгенерировать текст» — готовый текст появится здесь.";
const PROMPT_LYRICS_LOCKED_HINT =
  "Сначала очистите текст песни ниже, чтобы описать идею для AI.";

interface MusicCreateLyricsStepProps {
  configured: boolean | null;
  durationSec: number;
  isBusy: boolean;
  lyricsBrief: string;
  prompt: string;
  onLyricsBriefChange: (value: string) => void;
  onManualLyricsChange: (value: string) => void;
  onApplyGeneratedLyrics: (text: string, suggestedTitle?: string) => void;
  onContinue: () => void;
}

export function MusicCreateLyricsStep({
  configured,
  durationSec,
  isBusy,
  lyricsBrief,
  prompt,
  onLyricsBriefChange,
  onManualLyricsChange,
  onApplyGeneratedLyrics,
  onContinue,
}: MusicCreateLyricsStepProps) {
  const subscriptionQuery = useSubscriptionQuery();
  const planId = subscriptionQuery.data?.planId ?? "free";
  const isSimplifiedGeneration =
    subscriptionQuery.data?.entitlements.features.musicGeneration === "simplified";
  const lyricsDurationSec = resolveLyricsDurationSecForPlan(planId, durationSec);
  const manualLyricsMaxLength = resolveManualLyricsMaxLength(planId, durationSec);
  const hasLyricsBrief = lyricsBrief.trim().length > 0;
  const hasManualLyrics = prompt.trim().length > 0;
  const manualLyricsLocked = hasLyricsBrief && !hasManualLyrics;
  const manualLyricsModerationResult = checkContentAllowed(prompt);
  const manualLyricsModerationError =
    manualLyricsModerationResult.allowed ? null : manualLyricsModerationResult.reasonMessageRu;
  const manualLyricsLengthError =
    hasManualLyrics && prompt.trim().length > manualLyricsMaxLength
      ? `Текст слишком длинный для ~${lyricsDurationSec} сек — максимум ${manualLyricsMaxLength} символов.`
      : null;
  const canContinue =
    hasManualLyrics && !manualLyricsModerationError && !manualLyricsLengthError;

  function handleContinue() {
    if (manualLyricsModerationError || manualLyricsLengthError) {
      return;
    }

    onContinue();
  }

  return (
    <div className={mc.fieldStack}>
      <div className={mc.wizardStepHeader}>
        <span className={mc.wizardStepBadge}>Шаг 1 из 2</span>
        <h2 className={mc.wizardStepTitle}>Генерация текста</h2>
        <p className={mc.wizardStepHint}>
          Выберите один способ: опишите идею для AI или введите готовый текст песни.
        </p>
      </div>

      <MusicLyricsFromPrompt
        configured={configured === true}
        disabled={isBusy || hasManualLyrics}
        isSimplifiedGeneration={isSimplifiedGeneration}
        lockedHint={PROMPT_LYRICS_LOCKED_HINT}
        lyricsBrief={lyricsBrief}
        lyricsDurationSec={lyricsDurationSec}
        onLyricsBriefChange={onLyricsBriefChange}
        onApply={onApplyGeneratedLyrics}
      />

      <p className={mc.lyricsOrDivider} aria-hidden>
        или
      </p>

      <label className="block">
        <span className={mc.fieldLabel}>Введи текст песни и его споет AI</span>
        {manualLyricsLocked ? (
          <DisabledTooltipWrap block content={MANUAL_LYRICS_LOCKED_HINT} wide>
            <div className="relative w-full">
              <textarea
                aria-describedby="manual-lyrics-locked-hint"
                className={cn(mc.textareaLarge, mc.fieldDisabled)}
                disabled
                maxLength={manualLyricsMaxLength}
                placeholder="Напишите собственные тексты, или куплеты (8 строк) для лучшего результата"
                value={prompt}
              />
              <div className={mc.counterPosLarge}>
                <CharCounter current={prompt.length} max={manualLyricsMaxLength} />
              </div>
            </div>
          </DisabledTooltipWrap>
        ) : (
          <div className="relative w-full">
            <textarea
              className={cn(mc.textareaLarge, isBusy && mc.fieldDisabled)}
              disabled={isBusy}
              maxLength={manualLyricsMaxLength}
              placeholder="Напишите собственные тексты, или куплеты (8 строк) для лучшего результата"
              value={prompt}
              onChange={(event) => onManualLyricsChange(event.target.value)}
            />
            <div className={mc.counterPosLarge}>
              <CharCounter current={prompt.length} max={manualLyricsMaxLength} />
            </div>
          </div>
        )}
        <p className={cn(mc.meta, "mt-2")}>
          {isSimplifiedGeneration
            ? `На Free — до ${manualLyricsMaxLength} символов (~${FREE_TIER_DEFAULT_DURATION_SEC} сек). На платных тарифах лимит растёт с длительностью трека.`
            : `Лимит текста: ${manualLyricsMaxLength} символов (~${lyricsDurationSec} сек).`}
        </p>
        {manualLyricsLocked ? (
          <p className={cn(mc.meta, "mt-1")} id="manual-lyrics-locked-hint">
            {MANUAL_LYRICS_LOCKED_HINT}
          </p>
        ) : null}
        {manualLyricsLengthError ? (
          <p className={cn(mc.errorInline, "mt-2")} role="alert">
            {manualLyricsLengthError}
          </p>
        ) : null}
        {hasManualLyrics && manualLyricsModerationError ? (
          <p className={cn(mc.errorInline, "mt-2")} role="alert">
            {manualLyricsModerationError}
          </p>
        ) : null}
      </label>

      <button
        className={cn(mc.submit, "inline-flex items-center justify-center gap-2")}
        disabled={isBusy || !canContinue}
        type="button"
        onClick={handleContinue}
      >
        Далее: создание музыки
        <IconChevronRight />
      </button>
    </div>
  );
}
