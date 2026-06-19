"use client";

import type { VocalGender } from "@ai-music/shared";
import { VOCAL_GENDER_LABELS } from "@ai-music/shared";
import { voiceUi } from "@/features/voice/voice-classes";

interface VoiceGenderSelectProps {
  disabled?: boolean;
  value: VocalGender | null;
  onChange: (value: VocalGender) => void;
}

function GenderButton({
  active,
  children,
  disabled,
  onSelect,
}: {
  active: boolean;
  children: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  const className = active ? voiceUi.genderButtonActive : voiceUi.genderButton;

  if (active) {
    return (
      <button
        aria-pressed="true"
        className={className}
        disabled={disabled}
        type="button"
        onClick={onSelect}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      aria-pressed="false"
      className={className}
      disabled={disabled}
      type="button"
      onClick={onSelect}
    >
      {children}
    </button>
  );
}

export function VoiceGenderSelect({
  disabled = false,
  value,
  onChange,
}: VoiceGenderSelectProps) {
  return (
    <div
      className={voiceUi.genderSelect}
      role="group"
      aria-label="Пол для записи голоса"
    >
      <span className={voiceUi.genderLabel}>Пол:</span>
      <div className={voiceUi.genderButtons}>
        {(["m", "f"] as const).map((gender) => (
          <GenderButton
            key={gender}
            active={value === gender}
            disabled={disabled}
            onSelect={() => onChange(gender)}
          >
            {VOCAL_GENDER_LABELS[gender]}
          </GenderButton>
        ))}
      </div>
    </div>
  );
}
