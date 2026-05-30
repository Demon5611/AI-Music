import type { KitsVoiceModel } from "@ai-music/shared";

export const KITS_VOICE_MODELS_PAGE_SIZE = 20;
export const KITS_VOICE_MODELS_MAX_SEARCH_PAGES = 5;

export function filterKitsVoiceModels(models: KitsVoiceModel[], query: string): KitsVoiceModel[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return models;
  }

  return models.filter((model) => {
    if (model.title.toLowerCase().includes(normalized)) {
      return true;
    }

    if (String(model.id).includes(normalized)) {
      return true;
    }

    return model.tags.some((tag) => tag.toLowerCase().includes(normalized));
  });
}

export function isKitsVoiceModelSearchActive(query: string): boolean {
  return query.trim().length >= 2;
}
