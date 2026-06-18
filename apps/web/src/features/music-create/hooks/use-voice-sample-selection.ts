"use client";

import type { VoiceSample } from "@ai-music/shared";
import { useCallback, useEffect, useState } from "react";
import {
  isVoiceSampleReadyForGeneration,
} from "@/entities/voice-sample";
import { pickDefaultVoiceSampleId } from "@/entities/voice-sample/voice-sample-display";
import { useApi } from "@/shared/providers/api-provider";

const STORAGE_KEY = "ai-music:selected-voice-sample-id";

function readStoredVoiceSampleId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

function writeStoredVoiceSampleId(sampleId: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!sampleId) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, sampleId);
}

export function useVoiceSampleSelection(authReady: boolean) {
  const api = useApi();
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingSampleId, setDeletingSampleId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const setSelectedId = useCallback((sampleId: string | null) => {
    setSelectedIdState(sampleId);
    writeStoredVoiceSampleId(sampleId);
  }, []);

  const removeSample = useCallback(
    async (sampleId: string) => {
      const confirmed = window.confirm(
        "Удалить этот образец голоса? Файл будет удалён без возможности восстановления.",
      );

      if (!confirmed) {
        return;
      }

      setDeletingSampleId(sampleId);
      setDeleteError(null);

      try {
        await api.voiceSamples.remove(sampleId);

        const nextSamples = samples.filter((sample) => sample.id !== sampleId);
        setSamples(nextSamples);
        setSelectedId(
          pickDefaultVoiceSampleId(
            nextSamples,
            selectedId === sampleId ? null : selectedId,
          ),
        );
      } catch {
        setDeleteError("Не удалось удалить образец голоса");
      } finally {
        setDeletingSampleId(null);
      }
    },
    [api, samples, selectedId, setSelectedId],
  );

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let cancelled = false;

    async function loadSamples() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const nextSamples = await api.voiceSamples.list();

        if (cancelled) {
          return;
        }

        setSamples(nextSamples);
        setSelectedIdState(
          pickDefaultVoiceSampleId(nextSamples, readStoredVoiceSampleId()),
        );
      } catch {
        if (!cancelled) {
          setSamples([]);
          setSelectedIdState(null);
          setLoadError("Не удалось загрузить образцы голоса");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSamples();

    return () => {
      cancelled = true;
    };
  }, [api, authReady]);

  const readySamples = samples.filter(isVoiceSampleReadyForGeneration);
  const selectedSample =
    samples.find((sample) => sample.id === selectedId) ?? null;
  const hasReadyVoice = readySamples.length > 0;
  const canGenerateWithVoice =
    selectedSample !== null && isVoiceSampleReadyForGeneration(selectedSample);

  return {
    samples,
    readySamples,
    selectedId,
    selectedSample,
    hasReadyVoice,
    canGenerateWithVoice,
    isLoading,
    loadError,
    setSelectedId,
    removeSample,
    deletingSampleId,
    deleteError,
  };
}
