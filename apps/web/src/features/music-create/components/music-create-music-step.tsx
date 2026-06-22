"use client";

import type { GenerateSongInput } from "@/features/music-create/hooks/use-music-generation";
import { useSubscriptionQuery } from "@/features/billing/hooks/use-subscription-query";
import { mc } from "@/features/music-create/music-create-classes";
import { MusicStyleChips } from "@/features/music-create/music-style-chips-panel";
import {
  CharCounter,
  IconChevronDown,
  IconChevronLeft,
  IconClock,
  IconWand,
} from "@/features/music-create/components/music-create-icons";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ALL_DURATION_OPTIONS,
  FREE_TIER_DEFAULT_COMBO_STYLE,
  FREE_TIER_DEFAULT_DURATION_SEC,
  formatDurationOptionLabel,
  canAffordTrackGeneration,
  formatCreditsFromUnits,
  getDurationOptionsForPlan,
  isComboStylePreset,
  isDurationAllowedForPlan,
  isVocalGender,
  OPERATION_COST_UNITS,
  unitsToCredits,
  VOCAL_GENDER_LABELS,
} from "@ai-music/shared";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/providers/api-provider";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useEffect, useState } from "react";

const STYLE_MAX_LENGTH = 200;
const TITLE_MAX_LENGTH = 100;

const PAID_PLAN_HINT = "Pro+";

interface MusicCreateMusicStepProps {
  configured: boolean | null;
  canGenerateWithVoice: boolean;
  isBusy: boolean;
  isGenerating: boolean;
  title: string;
  style: string;
  prompt: string;
  durationSec: number;
  voiceSampleId: string | null;
  onTitleChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onDurationChange: (value: number) => void;
  onBack: () => void;
  onGenerate: (input: GenerateSongInput) => void;
}

export function MusicCreateMusicStep({
  configured,
  canGenerateWithVoice,
  isBusy,
  isGenerating,
  title,
  style,
  prompt,
  durationSec,
  voiceSampleId,
  onTitleChange,
  onStyleChange,
  onDurationChange,
  onBack,
  onGenerate,
}: MusicCreateMusicStepProps) {
  const api = useApi();
  const authReady = useAuthReady();
  const userQuery = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => api.users.getMe(),
    enabled: authReady,
  });
  const vocalGender =
    userQuery.data?.vocalGender && isVocalGender(userQuery.data.vocalGender)
      ? userQuery.data.vocalGender
      : null;
  const subscriptionQuery = useSubscriptionQuery();
  const planId = subscriptionQuery.data?.planId ?? "free";
  const isSimplifiedGeneration =
    subscriptionQuery.data?.entitlements.features.musicGeneration === "simplified";
  const allowedDurationOptions = getDurationOptionsForPlan(planId);
  const creditsBalance = subscriptionQuery.data?.creditsBalance ?? 0;
  const generationCostCredits = unitsToCredits(OPERATION_COST_UNITS.generateTrack);
  const hasEnoughCredits = canAffordTrackGeneration(creditsBalance);
  const [durationNotice, setDurationNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isSimplifiedGeneration) {
      return;
    }

    if (!isDurationAllowedForPlan(planId, durationSec)) {
      onDurationChange(FREE_TIER_DEFAULT_DURATION_SEC);
    }
  }, [durationSec, isSimplifiedGeneration, onDurationChange, planId]);

  useEffect(() => {
    if (!isSimplifiedGeneration) {
      return;
    }

    if (!isComboStylePreset(style)) {
      onStyleChange(FREE_TIER_DEFAULT_COMBO_STYLE);
    }
  }, [isSimplifiedGeneration, onStyleChange, style]);

  function handleDurationChange(nextValue: number) {
    if (!isDurationAllowedForPlan(planId, nextValue)) {
      setDurationNotice("Другие длительности доступны на платных тарифах.");
      onDurationChange(FREE_TIER_DEFAULT_DURATION_SEC);
      return;
    }

    setDurationNotice(null);
    onDurationChange(nextValue);
  }

  return (
    <div className={mc.fieldStack}>
      <div className={mc.wizardStepHeader}>
        <span className={mc.wizardStepBadge}>Шаг 2 из 2</span>
        <h2 className={mc.wizardStepTitle}>Создание музыки</h2>
        <p className={mc.wizardStepHint}>
          Выберите стиль, название и длительность — вокал будет вашим AI Music Voice
          {vocalGender ? ` (${VOCAL_GENDER_LABELS[vocalGender].toLowerCase()}).` : "."}
        </p>
      </div>

      <div className={mc.wizardLyricsPreview}>
        <span className={mc.fieldLabel}>Текст песни</span>
        <pre className={mc.wizardLyricsPreviewText}>{prompt.trim() || "—"}</pre>
      </div>

      <label className="block">
        <span className={mc.fieldLabel}>Название</span>
        <input
          className={mc.input}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="Введите название"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>

      <div>
        <span className={mc.fieldLabel} id="music-style-label">
          Стиль музыки
        </span>
        <MusicStyleChips
          allowCustomStyles={!isSimplifiedGeneration}
          maxLength={STYLE_MAX_LENGTH}
          showLabel={false}
          value={style}
          onChange={onStyleChange}
        />
        <div className="relative mt-2">
          <textarea
            aria-labelledby="music-style-label"
            className={cn(
              mc.textarea,
              mc.textareaStyle,
              isSimplifiedGeneration && mc.styleReadonly,
            )}
            disabled={isSimplifiedGeneration}
            maxLength={STYLE_MAX_LENGTH}
            placeholder="pop, hyperpop, upbeat, 120 BPM"
            readOnly={isSimplifiedGeneration}
            value={style}
            onChange={(event) => onStyleChange(event.target.value)}
          />
          <div className={mc.counterPos}>
            <CharCounter current={style.length} max={STYLE_MAX_LENGTH} />
          </div>
        </div>
      </div>

      <label className="block">
        <span className={mc.fieldLabel}>
          Длительность (AI не всегда точно соблюдает заданную длительность)
        </span>
        <div className={mc.durationWrap}>
          <span aria-hidden="true" className={mc.durationIcon}>
            <IconClock />
          </span>
          <select
            className={mc.select}
            value={durationSec}
            onChange={(event) => handleDurationChange(Number(event.target.value))}
          >
            {ALL_DURATION_OPTIONS.map((value) => {
              const isAllowed = allowedDurationOptions.includes(value);
              const label = formatDurationOptionLabel(value, planId);

              return (
                <option key={value} disabled={!isAllowed} value={value}>
                  {isAllowed ? label : `${label} (${PAID_PLAN_HINT})`}
                </option>
              );
            })}
          </select>
          <span aria-hidden="true" className={mc.durationChevron}>
            <IconChevronDown />
          </span>
        </div>
        {isSimplifiedGeneration ? (
          <p className={cn(mc.styleHint, "mt-2")}>
            На Free доступна только 30 сек. Другие длительности — на платных тарифах.
          </p>
        ) : null}
        {durationNotice ? (
          <p className={cn(mc.planNotice, "mt-2")} role="status">
            {durationNotice}{" "}
            <Link className={mc.planNoticeLink} href="/pricing">
              Тарифы
            </Link>
          </p>
        ) : null}
      </label>

      <p className={mc.generationCostHint}>
        Стоимость генерации: {formatCreditsFromUnits(OPERATION_COST_UNITS.generateTrack)} credits.
        Баланс: {creditsBalance}.
        {!hasEnoughCredits ? (
          <>
            {" "}
            <Link className={mc.planNoticeLink} href="/pricing">
              Пополнить на странице тарифов
            </Link>
          </>
        ) : null}
      </p>

      <div className={mc.wizardActions}>
        <button
          className={cn(mc.secondaryButton, "inline-flex items-center justify-center gap-2")}
          disabled={isBusy}
          type="button"
          onClick={onBack}
        >
          <IconChevronLeft />
          Назад к тексту
        </button>
        <button
          className={cn(mc.submit, "inline-flex items-center justify-center gap-2")}
          disabled={
            isBusy ||
            configured !== true ||
            !canGenerateWithVoice ||
            !prompt.trim() ||
            !hasEnoughCredits
          }
          type="button"
          onClick={() =>
            void onGenerate({
              prompt,
              style,
              title,
              durationSec,
              voiceSampleId,
            })
          }
        >
          {isGenerating ? (
            <>
              <span aria-hidden="true" className={mc.submitSpinner} />
              Запуск...
            </>
          ) : (
            <>
              <IconWand />
              Создать музыку
            </>
          )}
        </button>
      </div>
    </div>
  );
}
