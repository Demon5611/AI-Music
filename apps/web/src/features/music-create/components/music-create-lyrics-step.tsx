"use client";

import { mc } from "@/features/music-create/music-create-classes";
import { MusicLyricsFromPrompt } from "@/features/music-create/music-lyrics-from-prompt";
import {
  CharCounter,
  IconChevronRight,
} from "@/features/music-create/components/music-create-icons";
import { cn } from "@/lib/utils";

const LYRICS_MAX_LENGTH = 3000;

interface MusicCreateLyricsStepProps {
  configured: boolean | null;
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
  isBusy,
  lyricsBrief,
  prompt,
  onLyricsBriefChange,
  onManualLyricsChange,
  onApplyGeneratedLyrics,
  onContinue,
}: MusicCreateLyricsStepProps) {
  const hasLyricsBrief = lyricsBrief.trim().length > 0;
  const hasManualLyrics = prompt.trim().length > 0;
  const canContinue = hasManualLyrics;

  return (
    <div className={mc.fieldStack}>
      <div className={mc.wizardStepHeader}>
        <span className={mc.wizardStepBadge}>Шаг 1 из 2</span>
        <h2 className={mc.wizardStepTitle}>Генерация текста</h2>
        <p className={mc.wizardStepHint}>
          Опишите идею для AI или введите готовый текст песни.
        </p>
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

      <button
        className={cn(mc.submit, "inline-flex items-center justify-center gap-2")}
        disabled={isBusy || !canContinue}
        type="button"
        onClick={onContinue}
      >
        Далее: создание музыки
        <IconChevronRight />
      </button>
    </div>
  );
}
