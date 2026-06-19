"use client";

import type { GenerateSongInput } from "@/features/music-create/hooks/use-music-generation";
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

const STYLE_MAX_LENGTH = 200;
const TITLE_MAX_LENGTH = 100;

const DURATION_OPTIONS = [
  { value: 0, label: "Auto (~2–3 мин)" },
  { value: 30, label: "~30 сек" },
  { value: 60, label: "~1 мин" },
  { value: 120, label: "~2 мин" },
] as const;

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
  return (
    <div className={mc.fieldStack}>
      <div className={mc.wizardStepHeader}>
        <span className={mc.wizardStepBadge}>Шаг 2 из 2</span>
        <h2 className={mc.wizardStepTitle}>Создание музыки</h2>
        <p className={mc.wizardStepHint}>
          Выберите стиль, название и длительность — вокал будет вашим Suno Voice.
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
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
