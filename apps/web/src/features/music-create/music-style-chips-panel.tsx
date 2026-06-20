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
import { DisabledTooltipWrap } from "@/shared/ui/tooltip";
import { cn } from "@/lib/utils";

const PAID_PLAN_CHIP_TOOLTIP = "Доступно на платных тарифах";

interface MusicStyleChipsProps {
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  showLabel?: boolean;
  allowCustomStyles?: boolean;
}

interface StyleChipOptionProps {
  chip: string;
  selected: boolean;
  disabled: boolean;
  lockedByPlan: boolean;
  onToggle: () => void;
}

function StyleChipOption({
  chip,
  selected,
  disabled,
  lockedByPlan,
  onToggle,
}: StyleChipOptionProps) {
  const chipClassName = cn(selected ? mc.chipSelected : mc.chip, disabled && mc.chipDisabled);

  const label = (
    <label className={chipClassName}>
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

  if (lockedByPlan) {
    return (
      <DisabledTooltipWrap content={PAID_PLAN_CHIP_TOOLTIP} wide>
        {label}
      </DisabledTooltipWrap>
    );
  }

  return label;
}

export function MusicStyleChips({
  value,
  maxLength,
  onChange,
  showLabel = true,
  allowCustomStyles = true,
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
          const lockedByPlan = !allowCustomStyles;
          const disabled =
            lockedByPlan ||
            isStyleChipDisabled(value, chip, MAX_SELECTED_STYLE_CHIPS, maxLength);

          return (
            <StyleChipOption
              key={chip}
              chip={chip}
              disabled={disabled}
              lockedByPlan={lockedByPlan}
              selected={selected}
              onToggle={() =>
                onChange(toggleStyleChip(value, chip, MAX_SELECTED_STYLE_CHIPS, maxLength))
              }
            />
          );
        })}
      </div>
      {allowCustomStyles ? (
        <p className={cn(mc.styleHint, "mt-2")}>
          Выберите {RECOMMENDED_STYLE_CHIPS_MIN}–{MAX_SELECTED_STYLE_CHIPS} тегов — AI Music лучше
          понимает короткие стили через запятую, чем длинные описания. Выбрано: {selectedCount}/
          {MAX_SELECTED_STYLE_CHIPS}.
        </p>
      ) : (
        <p className={cn(mc.styleHint, "mt-2")}>
          На Free доступен только комбо-стиль. Свои теги и ручной ввод — на платных тарифах.
        </p>
      )}
    </div>
  );
}
