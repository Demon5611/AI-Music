"use client";

import type { VoiceSample } from "@ai-music/shared";
import { buildRecommendedVoiceSampleDurationLabel } from "@ai-music/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isVoiceSampleReadyForGeneration } from "@/entities/voice-sample";
import { SunoVoiceVerifyFlow } from "@/features/voice/suno-voice-verify-flow";
import { VoiceSampleCard } from "@/features/voice/voice-sample-card";
import { VoiceAuthGate } from "@/features/voice/voice-auth-gate";
import { VoiceUploadPanel } from "@/features/voice/voice-upload-panel";
import { voiceUi } from "@/features/voice/voice-classes";
import { useAuthSession } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { appShell } from "@/shared/theme/app-theme";
import { LoadingPanel } from "@/shared/ui/elevenlabs";

type VoiceCreationVariant = "page" | "landing";

interface VoiceCreationPanelProps {
  variant?: VoiceCreationVariant;
}

export function VoiceCreationPanel({ variant = "landing" }: VoiceCreationPanelProps) {
  const api = useApi();
  const { isLoaded, isSignedIn, authReady } = useAuthSession();
  const [sample, setSample] = useState<VoiceSample | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(true);

  const loadLatestSample = useCallback(async (isCancelled: () => boolean) => {
    if (!authReady) {
      if (!isCancelled()) {
        setIsLoading(false);
      }
      return;
    }

    if (!isCancelled()) {
      setIsLoading(true);
    }

    try {
      const samples = await api.voiceSamples.list();
      if (isCancelled()) {
        return;
      }

      const latest = samples[0] ?? null;
      setSample(latest);
      setShowUploadForm(!latest || latest.voiceCloneStatus === "failed");
    } catch {
      if (!isCancelled()) {
        setSample(null);
      }
    } finally {
      if (!isCancelled()) {
        setIsLoading(false);
      }
    }
  }, [api, authReady]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => loadLatestSample(() => cancelled));

    return () => {
      cancelled = true;
    };
  }, [loadLatestSample]);

  function handleUploadSuccess(sampleId: string) {
    setShowUploadForm(false);
    void api.voiceSamples
      .list()
      .then((samples) => {
        const uploaded = samples.find((item) => item.id === sampleId) ?? samples[0] ?? null;
        setSample(uploaded);
      })
      .catch(() => {
        setSample(null);
      });
  }

  const handleVoiceReady = useCallback(() => {
    void loadLatestSample(() => false);
  }, [loadLatestSample]);

  const handleRecordNewSample = useCallback(() => {
    setShowUploadForm(true);
    setSample(null);
  }, []);

  const toggleUploadForm = useCallback(() => {
    setShowUploadForm((value) => !value);
  }, []);

  const handleSampleChange = useCallback((updated: VoiceSample) => {
    setSample(updated);
  }, []);

  if (!isLoaded) {
    return variant === "landing" ? <LoadingPanel lines={3} /> : <LoadingPanel />;
  }

  if (!isSignedIn) {
    return <VoiceAuthGate variant={variant} />;
  }

  if (isLoading) {
    return variant === "landing" ? <LoadingPanel lines={3} /> : <LoadingPanel />;
  }

  const isReady = sample ? isVoiceSampleReadyForGeneration(sample) : false;
  const needsVerification = sample && !isReady;

  const recommendedDurationLabel = buildRecommendedVoiceSampleDurationLabel();

  return (
    <section className={voiceUi.creationSection}>
      <div>
        <h2 className={voiceUi.creationSectionTitle}>Создание голоса</h2>
        <p className={voiceUi.creationSectionHint}>
          Запишите напев {recommendedDurationLabel} на главной — фраза верификации короткая и не
          заменит короткий семпл. Затем пройдите верификацию AI Music.
        </p>
      </div>

      {sample ? <VoiceSampleCard sample={sample} /> : null}

      {needsVerification ? (
        <SunoVoiceVerifyFlow
          key={sample.id}
          sampleId={sample.id}
          variant="inline"
          onRecordNewSample={handleRecordNewSample}
          onSampleChange={handleSampleChange}
          onVoiceReady={handleVoiceReady}
        />
      ) : null}

      {isReady ? (
        <div className={voiceUi.verifyReadyActions}>
          <p className={voiceUi.creationSectionHint}>
            Голос готов. Можно перейти к генерации текста и музыки.
          </p>
          <Link className={appShell.formSubmit} href="/music-create">
            Создать трек
          </Link>
        </div>
      ) : null}

      {sample ? (
        showUploadForm ? (
          <button
            aria-controls="voice-upload-form-panel"
            aria-expanded="true"
            className={cn(voiceUi.uploadFormToggle, voiceUi.uploadFormToggleActive)}
            type="button"
            onClick={toggleUploadForm}
          >
            Добавить новый образец
          </button>
        ) : (
          <button
            aria-controls="voice-upload-form-panel"
            aria-expanded="false"
            className={voiceUi.uploadFormToggle}
            type="button"
            onClick={toggleUploadForm}
          >
            Добавить новый образец
          </button>
        )
      ) : null}

      <div hidden={Boolean(sample) && !showUploadForm} id="voice-upload-form-panel">
        {showUploadForm || !sample ? (
          <VoiceUploadPanel
            embedded
            variant={variant}
            onSuccess={handleUploadSuccess}
          />
        ) : null}
      </div>
    </section>
  );
}
