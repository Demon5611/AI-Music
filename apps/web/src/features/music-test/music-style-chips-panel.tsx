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
import styles from "./styles/music-test.module.css";

interface MusicStyleChipsProps {
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}

interface StyleChipOptionProps {
  chip: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function StyleChipOption({ chip, selected, disabled, onToggle }: StyleChipOptionProps) {
  return (
    <label className={selected ? styles.chipSelected : styles.chip}>
      <input
        checked={selected}
        className={styles.chipInput}
        disabled={disabled}
        type="checkbox"
        onChange={onToggle}
      />
      {chip}
    </label>
  );
}

export function MusicStyleChips({ value, maxLength, onChange }: MusicStyleChipsProps) {
  const selectedCount = parseStyleTags(value).length;

  return (
    <div className={styles.styleFieldBlock}>
      <div className={styles.styleFieldHeader}>
        <span className={styles.label} id="music-style-label">
          Стиль музыки
        </span>
        <div
          aria-labelledby="music-style-label"
          className={styles.chipRow}
          role="group"
        >
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
      </div>
      <p className={styles.styleChipHint}>
        Выберите {RECOMMENDED_STYLE_CHIPS_MIN}–{MAX_SELECTED_STYLE_CHIPS} тегов — Suno лучше
        понимает короткие стили через запятую, чем длинные описания. Выбрано: {selectedCount}/
        {MAX_SELECTED_STYLE_CHIPS}.
      </p>
    </div>
  );
}
