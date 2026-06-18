"use client";

import type { GenerateSongInput } from "@/features/music-create/hooks/use-music-generation";
import { mc } from "@/features/music-create/music-create-classes";
import { MusicLyricsFromPrompt } from "@/features/music-create/music-lyrics-from-prompt";
import { MusicStyleChips } from "@/features/music-create/music-style-chips-panel";
import {
  CharCounter,
  IconChevronDown,
  IconClock,
  IconWand,
} from "@/features/music-create/components/music-create-icons";
import { cn } from "@/lib/utils";

const STYLE_MAX_LENGTH = 200;
const LYRICS_MAX_LENGTH = 3000;
const TITLE_MAX_LENGTH = 100;

const DURATION_OPTIONS = [
  { value: 0, label: "Auto (~2–3 мин)" },
  { value: 30, label: "~30 сек" },
  { value: 60, label: "~1 мин" },
  { value: 120, label: "~2 мин" },
] as const;

interface MusicCreateFormProps {
  configured: boolean | null;
  canGenerateWithVoice: boolean;
  isBusy: boolean;
  isGenerating: boolean;
  title: string;
  style: string;
  prompt: string;
  lyricsBrief: string;
  durationSec: number;
  voiceSampleId: string | null;
  onTitleChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onLyricsBriefChange: (value: string) => void;
  onManualLyricsChange: (value: string) => void;
  onApplyGeneratedLyrics: (text: string, suggestedTitle?: string) => void;
  onDurationChange: (value: number) => void;
  onGenerate: (input: GenerateSongInput) => void;
}

export function MusicCreateForm({
  configured,
  canGenerateWithVoice,
  isBusy,
  isGenerating,
  title,
  style,
  prompt,
  lyricsBrief,
  durationSec,
  voiceSampleId,
  onTitleChange,
  onStyleChange,
  onLyricsBriefChange,
  onManualLyricsChange,
  onApplyGeneratedLyrics,
  onDurationChange,
  onGenerate,
}: MusicCreateFormProps) {
  const hasLyricsBrief = lyricsBrief.trim().length > 0;
  const hasManualLyrics = prompt.trim().length > 0;

  return (
    <div className={mc.fieldStack}>
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

      <MusicLyricsFromPrompt
        configured={configured === true}
        disabled={isBusy || hasManualLyrics}
        lyricsBrief={lyricsBrief}
        onLyricsBriefChange={onLyricsBriefChange}
        onApply={onApplyGeneratedLyrics}
      />

      <p className={mc.lyricsOrDivider} aria-hidden>
        или
      </p>

      <label className="block">
        <span className={mc.fieldLabel}>Введи текст песни и его споет AI</span>
        <div className="relative">
          <textarea
            className={cn(mc.textareaLarge, (isBusy || hasLyricsBrief) && mc.fieldDisabled)}
            disabled={isBusy || hasLyricsBrief}
            maxLength={LYRICS_MAX_LENGTH}
            placeholder="Напишите собственные тексты, или куплеты (8 строк) для лучшего результата"
            value={prompt}
            onChange={(event) => onManualLyricsChange(event.target.value)}
          />
          <div className={mc.counterPosLarge}>
            <CharCounter current={prompt.length} max={LYRICS_MAX_LENGTH} />
          </div>
        </div>
        {hasLyricsBrief && !hasManualLyrics ? (
          <p className={mc.meta}>
            Очистите описание выше или нажмите «Сгенерировать текст», чтобы заполнить это поле.
          </p>
        ) : null}
      </label>

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
        {durationSec > 0 ? (
          <p className={mc.meta}>
            AI не гарантирует точную длительность — подсказка добавляется в поле «Стиль музыки».
            Для коротких треков (~30 сек) используйте краткий стиль и короткие тексты.
          </p>
        ) : null}
      </label>

      <button
        className={mc.submit}
        disabled={isBusy || configured !== true || !canGenerateWithVoice}
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
  );
}
