"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { consumeMusicCreateLyricsBriefDraft } from "@/shared/lib/music-create-prompt-transfer";
import { MusicCreateLyricsStep } from "@/features/music-create/components/music-create-lyrics-step";
import { MusicCreateMusicStep } from "@/features/music-create/components/music-create-music-step";
import { IconMusic } from "@/features/music-create/components/music-create-icons";
import { MusicCreateResults } from "@/features/music-create/components/music-create-results";
import { useMusicGeneration } from "@/features/music-create/hooks/use-music-generation";
import { useVoiceSampleSelection } from "@/features/music-create/hooks/use-voice-sample-selection";
import { useSubscriptionQuery } from "@/features/billing/hooks/use-subscription-query";
import { mc } from "@/features/music-create/music-create-classes";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { mp } from "@/shared/theme/music-page-classes";
import { RequireAuth } from "@/shared/ui/require-auth";
import {
  FREE_TIER_DEFAULT_COMBO_STYLE,
  FREE_TIER_DEFAULT_DURATION_SEC,
  getDefaultDurationSecForPlan,
} from "@ai-music/shared";

const DEFAULT_TITLE = "Summer Friends";

type WizardStep = "lyrics" | "music";

export function MusicCreatePanel() {
  return (
    <RequireAuth
      hint="Зарегистрируйтесь бесплатно, чтобы создавать треки с вашим AI-вокалом."
      title="Войдите, чтобы создавать музыку"
    >
      <MusicCreatePanelContent />
    </RequireAuth>
  );
}

function MusicCreatePanelContent() {
  const authReady = useAuthReady();
  const subscriptionQuery = useSubscriptionQuery();
  const [wizardStep, setWizardStep] = useState<WizardStep>("lyrics");
  const [durationSec, setDurationSec] = useState(FREE_TIER_DEFAULT_DURATION_SEC);
  const [lyricsBrief, setLyricsBrief] = useState(
    () => consumeMusicCreateLyricsBriefDraft() ?? "",
  );
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(FREE_TIER_DEFAULT_COMBO_STYLE);
  const [title, setTitle] = useState(DEFAULT_TITLE);

  const {
    configured,
    statusLoadError,
    taskId,
    status,
    error,
    isGenerating,
    isDeletingTrack,
    isOpeningEditor,
    openingEditorTrackId,
    isPolling,
    isBusy,
    songTracks,
    generate,
    openEditor,
    deleteTrack,
  } = useMusicGeneration();

  const {
    hasReadyVoice,
    canGenerateWithVoice,
    isLoading: isVoiceSamplesLoading,
    loadError: voiceSamplesLoadError,
    selectedId: selectedVoiceSampleId,
  } = useVoiceSampleSelection(authReady);

  useEffect(() => {
    if (!subscriptionQuery.data) {
      return;
    }

    setDurationSec(getDefaultDurationSecForPlan(subscriptionQuery.data.planId));
  }, [subscriptionQuery.data?.planId]);

  const handleLyricsBriefChange = useCallback((value: string) => {
    setLyricsBrief(value);
    if (value.trim()) {
      setPrompt("");
    }
  }, []);

  const handleManualLyricsChange = useCallback((value: string) => {
    setPrompt(value);
    if (value.trim()) {
      setLyricsBrief("");
    }
  }, []);

  const handleApplyGeneratedLyrics = useCallback(
    (text: string, suggestedTitle?: string) => {
      setLyricsBrief("");
      setPrompt(text);

      if (suggestedTitle?.trim() && !title.trim()) {
        setTitle(suggestedTitle.trim());
      }
    },
    [title],
  );

  return (
    <div className={mp.page}>
      <header className={mp.pageHeader}>
        <div className={mp.pageHeaderBrand}>
          <div className={mp.pageHeaderLogo}>
            <IconMusic />
          </div>
          <span className={mp.pageHeaderTitle}>Music Create</span>
        </div>
      </header>

      <main className={mp.pageMain}>
        {statusLoadError ? (
          <div className={mp.alertError} role="alert">
            Не удалось связаться с API ({statusLoadError}). Запустите{" "}
            <code className={mp.inlineCode}>pnpm dev:api</code> и проверьте NEXT_PUBLIC_API_URL.
          </div>
        ) : null}

        {configured === false ? (
          <div className={mp.alertWarning} role="alert">
            Сервис генерации музыки не настроен. Добавьте API-ключ в корневой .env и перезапустите API.
          </div>
        ) : null}

        {voiceSamplesLoadError ? (
          <div className={mp.alertError} role="alert">
            {voiceSamplesLoadError}
          </div>
        ) : null}

        {!isVoiceSamplesLoading && !hasReadyVoice ? (
          <div className={mp.alertWarning} role="alert">
            Голос AI Music ещё не готов.{" "}
            <Link className={mc.voicePickerLink} href="/">
              Создайте и верифицируйте голос на главной
            </Link>
            — без этого песня будет с чужим AI-вокалом.
          </div>
        ) : null}

        {hasReadyVoice ? (
          <p className={mc.cardHeaderSubtitle}>
            Используется ваш последний верифицированный образец AI Music Voice.
          </p>
        ) : null}

        <section className={mp.sectionCard}>
          {wizardStep === "lyrics" ? (
            <MusicCreateLyricsStep
              configured={configured}
              durationSec={durationSec}
              isBusy={isBusy}
              lyricsBrief={lyricsBrief}
              prompt={prompt}
              onApplyGeneratedLyrics={handleApplyGeneratedLyrics}
              onContinue={() => setWizardStep("music")}
              onLyricsBriefChange={handleLyricsBriefChange}
              onManualLyricsChange={handleManualLyricsChange}
            />
          ) : (
            <MusicCreateMusicStep
              canGenerateWithVoice={canGenerateWithVoice}
              configured={configured}
              durationSec={durationSec}
              isBusy={isBusy}
              isGenerating={isGenerating}
              prompt={prompt}
              style={style}
              title={title}
              voiceSampleId={selectedVoiceSampleId}
              onBack={() => setWizardStep("lyrics")}
              onDurationChange={setDurationSec}
              onGenerate={(input) => void generate(input)}
              onStyleChange={setStyle}
              onTitleChange={setTitle}
            />
          )}

          <MusicCreateResults
            isBusy={isBusy}
            isDeletingTrack={isDeletingTrack}
            isGenerating={isGenerating}
            isOpeningEditor={isOpeningEditor}
            isPolling={isPolling}
            openingEditorTrackId={openingEditorTrackId}
            songTracks={songTracks}
            status={status}
            taskId={taskId}
            onDeleteTrack={(trackId) => void deleteTrack(trackId)}
            onOpenEditor={(trackId) => void openEditor(trackId)}
          />
        </section>

        {error ? (
          <div className={mp.alertError} role="alert">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}
