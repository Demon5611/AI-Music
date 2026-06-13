"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MUSIC_COMBO_STYLE_PRESETS,
  findComboStylePreset,
  type MusicComboStylePreset,
} from "./music-combo-style-presets";
import styles from "./styles/music-test.module.css";

interface MusicComboStyleChipProps {
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}

export function MusicComboStyleChip({ value, maxLength, onChange }: MusicComboStyleChipProps) {
  const [open, setOpen] = useState(false);
  const activePreset = findComboStylePreset(value);

  function handleSelect(preset: MusicComboStylePreset) {
    if (preset.style.length <= maxLength) {
      onChange(preset.style);
    }

    setOpen(false);
  }

  const chipClassName = open || activePreset ? styles.chipSelected : styles.chip;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={chipClassName} type="button">
        комбо-стиль
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className={styles.comboPanel}>
        {MUSIC_COMBO_STYLE_PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.label}
            className={
              activePreset?.label === preset.label
                ? styles.comboPanelItemActive
                : styles.comboPanelItem
            }
            onClick={() => handleSelect(preset)}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
