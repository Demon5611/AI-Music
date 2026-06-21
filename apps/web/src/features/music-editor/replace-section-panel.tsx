"use client";

import { useState } from "react";
import {
  OPERATION_COST_UNITS,
  formatCreditsFromUnits,
} from "@ai-music/shared";
import { parseApiError } from "@/shared/lib/parse-api-error";
import { useApi } from "@/shared/providers/api-provider";
import { PlanGatedWrap, usePlanGate } from "@/shared/ui/plan-gated";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { me } from "@/features/music-editor/music-editor-classes";

interface ReplaceSectionPanelProps {
  songId: string;
  selectedRegionId: string | null;
  disabled?: boolean;
}

export function ReplaceSectionPanel({
  songId,
  selectedRegionId,
  disabled = false,
}: ReplaceSectionPanelProps) {
  const api = useApi();
  const hydrate = useAudioEditorStore((state) => state.hydrate);
  const songPendingAction = useAudioEditorStore((state) => state.songPendingAction);
  const replaceGate = usePlanGate("replaceSections");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPending = songPendingAction === "replace_section";
  const actionsDisabled = disabled || !selectedRegionId || isPending || !replaceGate.allowed;

  async function handleReplace() {
    if (!selectedRegionId || !prompt.trim()) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const state = await api.musicEditor.replaceSection(songId, selectedRegionId, {
        prompt: prompt.trim(),
      });
      hydrate(state);
      setPrompt("");
    } catch (submitError) {
      setError(parseApiError(submitError, "Не удалось заменить фрагмент"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={me.panel}>
      <h3 className={me.panelTitle}>Replace section</h3>
      <p className={me.panelHint}>
        Перегенерировать выбранный фрагмент по описанию. Стоимость:{" "}
        {formatCreditsFromUnits(OPERATION_COST_UNITS.replaceSection)} credits.
      </p>

      {!selectedRegionId ? (
        <p className={me.panelHint}>Выберите фрагмент на timeline</p>
      ) : null}

      <PlanGatedWrap block feature="replaceSections" wide>
        <textarea
          className={me.replacePromptInput}
          disabled={actionsDisabled || isSubmitting}
          placeholder="Опишите, как должен звучать новый фрагмент"
          rows={4}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </PlanGatedWrap>

      <PlanGatedWrap feature="replaceSections">
        <button
          className={me.primaryButton}
          disabled={actionsDisabled || isSubmitting || !prompt.trim()}
          type="button"
          onClick={() => void handleReplace()}
        >
          {isPending || isSubmitting ? "Заменяем фрагмент..." : "Replace section"}
        </button>
      </PlanGatedWrap>

      {error ? <p className={me.error}>{error}</p> : null}
    </div>
  );
}
