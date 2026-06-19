"use client";

import type { VoiceSample } from "@ai-music/shared";
import { useEffect, useState } from "react";
import { isVoiceSampleReadyForGeneration } from "@/entities/voice-sample";
import { pickLatestReadyVoiceSampleId } from "@/entities/voice-sample/voice-sample-display";
import { useApi } from "@/shared/providers/api-provider";

export function useVoiceSampleSelection(authReady: boolean) {
  const api = useApi();
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      } catch {
        if (!cancelled) {
          setSamples([]);
          setLoadError("Не удалось загрузить образец голоса");
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
  const selectedId = pickLatestReadyVoiceSampleId(samples);
  const selectedSample =
    samples.find((sample) => sample.id === selectedId) ?? readySamples[0] ?? null;
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
  };
}
