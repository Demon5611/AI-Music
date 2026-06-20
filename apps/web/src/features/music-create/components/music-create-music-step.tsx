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
import { getAllowedDurationOptions } from "@ai-music/shared";
import { useEffect } from "react";

const STYLE_MAX_LENGTH = 200;
const TITLE_MAX_LENGTH = 100;

const DURATION_LABELS: Record<number, string> = {
  0: "Auto (~2–3 мин)",
  30: "~30 сек",
  60: "~1 мин",
  120: "~2 мин",
  180: "~3 мин",
};

interface MusicCreateMusicStepProps {
  configured: boolean | null;
  canGenerateWithVoice: boolean;
  isBusy: boolean;
  isGenerating: boolean;
  title: string;
  style: string;
  prompt: string;
  durationSec: number;
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
  onTitleChange,
  onStyleChange,
  onDurationChange,
  onBack,
  onGenerate,
}: MusicCreateMusicStepProps) {
  const subscriptionQuery = useSubscriptionQuery();
  const maxTrackDurationSec = subscriptionQuery.data?.entitlements.maxTrackDurationSec ?? 60;
  const durationOptions = getAllowedDurationOptions(maxTrackDurationSec);

  useEffect(() => {
    if (durationSec > 0 && durationSec > maxTrackDurationSec) {
      onDurationChange(maxTrackDurationSec);
    }
  }, [durationSec, maxTrackDurationSec, onDurationChange]);

  return (
    <div className={mc.fieldStack}>
      <div className={mc.wizardStepHeader}>
        <span className={mc.wizardStepBadge}>Шаг 2 из 2</span>
        <h2 className={mc.wizardStepTitle}>Создание музыки</h2>
        <p className={mc.wizardStepHint}>
          Выберите стиль, название и длительность — вокал будет вашим AI Music Voice.
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
          maxLength={STYLE_MAX_LENGTH}
          showLabel={false}
          value={style}
          onChange={onStyleChange}
        />
        <div className="relative mt-2">
          <textarea
            aria-labelledby="music-style-label"
            className={cn(mc.textarea, mc.textareaStyle)}
            maxLength={STYLE_MAX_LENGTH}
            placeholder="pop, hyperpop, upbeat, 120 BPM"
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
            onChange={(event) => onDurationChange(Number(event.target.value))}
          >
            {durationOptions.map((value) => (
              <option key={value} value={value}>
                {DURATION_LABELS[value] ?? `${value} сек`}
              </option>
            ))}
          </select>
          <span aria-hidden="true" className={mc.durationChevron}>
            <IconChevronDown />
          </span>
        </div>
      </label>

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
          disabled={isBusy || configured !== true || !canGenerateWithVoice || !prompt.trim()}
          type="button"
          onClick={() =>
            void onGenerate({
              prompt,
              style,
              title,
              durationSec,
              voiceSampleId: null,
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
