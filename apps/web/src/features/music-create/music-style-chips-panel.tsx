"use client";

import {
  MAX_SELECTED_STYLE_CHIPS,
  MUSIC_STYLE_CHIP_OPTIONS,
  RECOMMENDED_STYLE_CHIPS_MIN,
  isStyleChipDisabled,
  isStyleChipSelected,
  parseStyleTags,
  toggleStyleChip,
} from "./music-style-chips";
import { MusicComboStyleChip } from "./music-combo-style-chip";
import { mc } from "@/features/music-create/music-create-classes";
import { cn } from "@/lib/utils";

interface MusicStyleChipsProps {
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  showLabel?: boolean;
}

interface StyleChipOptionProps {
  chip: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function StyleChipOption({ chip, selected, disabled, onToggle }: StyleChipOptionProps) {
  return (
    <label className={cn(selected ? mc.chipSelected : mc.chip, disabled && mc.chipDisabled)}>
      <input
        aria-label={`Стиль: ${chip}`}
        checked={selected}
        className={mc.chipInput}
        disabled={disabled}
        type="checkbox"
        onChange={onToggle}
      />
      {chip}
    </label>
  );
}

export function MusicStyleChips({
  value,
  maxLength,
  onChange,
  showLabel = true,
}: MusicStyleChipsProps) {
  const selectedCount = parseStyleTags(value).length;

  return (
    <div className="mt-2">
      {showLabel ? (
        <span className={mc.fieldLabel} id="music-style-label">
          Стиль музыки
        </span>
      ) : null}
      <div
        aria-labelledby={showLabel ? "music-style-label" : undefined}
        className={cn(mc.chipRow, "mt-2")}
        role="group"
      >
        <MusicComboStyleChip maxLength={maxLength} value={value} onChange={onChange} />
        {MUSIC_STYLE_CHIP_OPTIONS.map((chip) => {
          const selected = isStyleChipSelected(value, chip);
          const disabled = isStyleChipDisabled(
            value,
            chip,
            MAX_SELECTED_STYLE_CHIPS,
            maxLength,
          );

          return (
            <StyleChipOption
              key={chip}
              chip={chip}
              disabled={disabled}
              selected={selected}
              onToggle={() =>
                onChange(toggleStyleChip(value, chip, MAX_SELECTED_STYLE_CHIPS, maxLength))
              }
            />
          );
        })}
      </div>
      <p className={cn(mc.styleHint, "mt-2")}>
        Выберите {RECOMMENDED_STYLE_CHIPS_MIN}–{MAX_SELECTED_STYLE_CHIPS} тегов — AI Music лучше
        понимает короткие стили через запятую, чем длинные описания. Выбрано: {selectedCount}/
        {MAX_SELECTED_STYLE_CHIPS}.
      </p>
    </div>
  );
}
