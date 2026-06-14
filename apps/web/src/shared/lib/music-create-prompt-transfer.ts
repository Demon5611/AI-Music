export const MUSIC_CREATE_PROMPT_DRAFT_KEY = "music-create:prompt-draft";
export const MUSIC_CREATE_PROMPT_MAX_LENGTH = 500;

export function saveMusicCreatePromptDraft(prompt: string) {
  if (typeof window === "undefined") {
    return;
  }

  const trimmed = prompt.trim().slice(0, MUSIC_CREATE_PROMPT_MAX_LENGTH);
  if (!trimmed) {
    return;
  }

  sessionStorage.setItem(MUSIC_CREATE_PROMPT_DRAFT_KEY, trimmed);
}

export function consumeMusicCreatePromptDraft(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const draft = sessionStorage.getItem(MUSIC_CREATE_PROMPT_DRAFT_KEY);
  if (!draft) {
    return null;
  }

  sessionStorage.removeItem(MUSIC_CREATE_PROMPT_DRAFT_KEY);
  return draft;
}
