export interface MusicComboStylePreset {
  label: string;
  style: string;
}

/** Ready-made style bundles for Suno custom mode (comma-separated tags). */
export const MUSIC_COMBO_STYLE_PRESETS: MusicComboStylePreset[] = [
  {
    label: "Энергичный гиперпоп гимн",
    style: "hyperpop, electropop, energetic, anthemic vocal, bright synths",
  },
  {
    label: "Мрачный бэдрум-поп",
    style: "bedroom pop, gloomy, slow tempo, soft vocal, intimate",
  },
  {
    label: "Эмоциональный инди-рок",
    style: "indie rock, emotional, guitar, male vocal, mid-tempo",
  },
  {
    label: "Тёмный трап бит",
    style: "trap, dark, 808 bass, moody, minimal vocal",
  },
  {
    label: "Заряженный поп-панк",
    style: "pop-punk, energetic, fast, distorted guitar, youthful vocal",
  },
  {
    label: "Мечтательный лоу-фай чилл",
    style: "lo-fi chill, dreamy, soft, warm textures, relaxed",
  },
  {
    label: "Танцевальный электропоп",
    style: "electropop, dance, upbeat, synth, catchy vocal",
  },
  {
    label: "Ностальгический поп 2000-х",
    style: "pop, 2000s, nostalgic, catchy vocal, bright production",
  },
  {
    label: "Агрессивный рейдж-рэп",
    style: "rage rap, aggressive, trap, heavy 808, intense vocal",
  },
  {
    label: "Мелодичный эмо-рэп",
    style: "emo rap, melodic, emotional, trap beat, autotune vocal",
  },
];

export function findComboStylePreset(style: string): MusicComboStylePreset | undefined {
  const normalized = style.trim().toLowerCase();

  return MUSIC_COMBO_STYLE_PRESETS.find(
    (preset) => preset.style.trim().toLowerCase() === normalized,
  );
}
