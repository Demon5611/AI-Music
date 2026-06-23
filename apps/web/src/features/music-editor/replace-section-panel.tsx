"use client";

import { useEffect, useMemo, useState } from "react";
import {
  OPERATION_COST_UNITS,
  formatCreditsFromUnits,
  type SongRegionLabel,
} from "@ai-music/shared";
import { parseApiError } from "@/shared/lib/parse-api-error";
import { useApi } from "@/shared/providers/api-provider";
import { useInvalidateCreditsBalance } from "@/features/billing/hooks/invalidate-credits-balance";
import { PlanGatedWrap, usePlanGate } from "@/shared/ui/plan-gated";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import {
  formatElapsedTime,
  useElapsedSeconds,
} from "@/features/music-editor/hooks/use-elapsed-seconds";
import { me } from "@/features/music-editor/music-editor-classes";

interface ReplaceSectionPanelProps {
  songId: string;
  selectedRegionId: string | null;
  disabled?: boolean;
}

const REPLACE_SECTION_ESTIMATE_SEC = 90;

const REGION_LABELS: Record<SongRegionLabel, string> = {
  intro: "Intro",
  verse: "Verse",
  chorus: "Chorus",
  bridge: "Bridge",
  outro: "Outro",
  custom: "Custom",
};

function resolveReplaceProgress(elapsedSeconds: number): number {
  if (elapsedSeconds <= REPLACE_SECTION_ESTIMATE_SEC) {
    return Math.round((elapsedSeconds / REPLACE_SECTION_ESTIMATE_SEC) * 85);
  }

  const overtimeSeconds = elapsedSeconds - REPLACE_SECTION_ESTIMATE_SEC;
  return Math.min(97, 85 + Math.floor(overtimeSeconds / 15));
}

function ReplaceSectionProgress({
  regionLabel,
  startedAtMs,
}: {
  regionLabel: string;
  startedAtMs: number;
}) {
  const elapsedSeconds = useElapsedSeconds(true, startedAtMs);
  const progress = resolveReplaceProgress(elapsedSeconds);
  const elapsedLabel = formatElapsedTime(elapsedSeconds);
  const estimateLabel = formatElapsedTime(REPLACE_SECTION_ESTIMATE_SEC);
  const isOvertime = elapsedSeconds > REPLACE_SECTION_ESTIMATE_SEC;

  return (
    <div className={me.replaceProgressStatus} role="status">
      <div className={me.preparationHeader}>
        <span className={me.preparationSpinner} aria-hidden="true" />
        <div>
          <p className={me.preparationTitle}>
            Заменяем фрагмент «{regionLabel}»...
          </p>
          <p className={me.preparationMeta}>
            {isOvertime
              ? `Прошло ${elapsedLabel}. Обычно до ${estimateLabel}, но Suno иногда отвечает дольше.`
              : `Прошло ${elapsedLabel}. Обычно это занимает до ${estimateLabel}.`}
          </p>
        </div>
      </div>

      <div className={me.preparationProgressRow}>
        <progress
          aria-label="Замена фрагмента"
          className={me.preparationProgress}
          max={100}
          value={progress}
        />
        <span className={me.preparationProgressValue}>{progress}%</span>
      </div>

      <p className={me.replaceProgressHint}>
        На timeline выделенный фрагмент подсвечен пунктиром. После завершения появится
        зелёная рамка и новая волна.
      </p>
    </div>
  );
}

export function ReplaceSectionPanel({
  songId,
  selectedRegionId,
  disabled = false,
}: ReplaceSectionPanelProps) {
  const api = useApi();
  const invalidateCreditsBalance = useInvalidateCreditsBalance();
  const hydrate = useAudioEditorStore((state) => state.hydrate);
  const regions = useAudioEditorStore((state) => state.regions);
  const songPendingAction = useAudioEditorStore((state) => state.songPendingAction);
  const songPendingRegionId = useAudioEditorStore((state) => state.songPendingRegionId);
  const replaceGate = usePlanGate("replaceSections");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingStartedAtMs, setPendingStartedAtMs] = useState<number | null>(null);

  const isPending = songPendingAction === "replace_section";
  const actionsDisabled = disabled || !selectedRegionId || isPending || !replaceGate.allowed;

  const pendingRegionLabel = useMemo(() => {
    if (!songPendingRegionId) {
      return "фрагмент";
    }

    const region = regions.find((item) => item.id === songPendingRegionId);
    if (!region) {
      return "фрагмент";
    }

    return REGION_LABELS[region.label] ?? region.label;
  }, [regions, songPendingRegionId]);

  useEffect(() => {
    if (isPending) {
      setPendingStartedAtMs((current) => current ?? Date.now());
      return;
    }

    setPendingStartedAtMs(null);
  }, [isPending]);

  async function handleReplace() {
    if (!selectedRegionId || !prompt.trim()) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setPendingStartedAtMs(Date.now());

    try {
      const state = await api.musicEditor.replaceSection(songId, selectedRegionId, {
        prompt: prompt.trim(),
      });
      hydrate(state);
      setPrompt("");
      void invalidateCreditsBalance();
    } catch (submitError) {
      setPendingStartedAtMs(null);
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

      {isPending && pendingStartedAtMs !== null ? (
        <ReplaceSectionProgress
          regionLabel={pendingRegionLabel}
          startedAtMs={pendingStartedAtMs}
        />
      ) : null}

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
