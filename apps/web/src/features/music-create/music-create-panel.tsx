"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { consumeMusicCreateLyricsBriefDraft } from "@/shared/lib/music-create-prompt-transfer";
import { MusicCreateLyricsStep } from "@/features/music-create/components/music-create-lyrics-step";
import { MusicCreateMusicStep } from "@/features/music-create/components/music-create-music-step";
import { IconMusic } from "@/features/music-create/components/music-create-icons";
import { MusicCreateResults } from "@/features/music-create/components/music-create-results";
import { useMusicGeneration } from "@/features/music-create/hooks/use-music-generation";
import { useVoiceSampleSelection } from "@/features/music-create/hooks/use-voice-sample-selection";
import { mc } from "@/features/music-create/music-create-classes";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { mp } from "@/shared/theme/music-page-classes";

const DEFAULT_STYLE = "lo-fi chill, dreamy, soft, warm textures, relaxed";
const DEFAULT_TITLE = "Summer Friends";

type WizardStep = "lyrics" | "music";

export function MusicCreatePanel() {
  const authReady = useAuthReady();
  const [wizardStep, setWizardStep] = useState<WizardStep>("lyrics");
  const [durationSec, setDurationSec] = useState(0);
  const [lyricsBrief, setLyricsBrief] = useState(
    () => consumeMusicCreateLyricsBriefDraft() ?? "",
  );
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(DEFAULT_STYLE);
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
  } = useVoiceSampleSelection(authReady);

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

  if (!authReady) {
    return (
      <div className={mp.authLoading}>
        <div className={mp.authLoadingInner}>
          <span aria-hidden="true" className={mp.spinner} />
          Загрузка сессии...
        </div>
      </div>
    );
  }

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
            SUNO_API_KEY не настроен. Добавьте ключ в корневой .env и перезапустите API.
          </div>
        ) : null}

        {voiceSamplesLoadError ? (
          <div className={mp.alertError} role="alert">
            {voiceSamplesLoadError}
          </div>
        ) : null}

        {!isVoiceSamplesLoading && !hasReadyVoice ? (
          <div className={mp.alertWarning} role="alert">
            Голос Suno ещё не готов.{" "}
            <Link className={mc.voicePickerLink} href="/">
              Создайте и верифицируйте голос на главной
            </Link>
            — без этого песня будет с чужим AI-вокалом.
          </div>
        ) : null}

        {hasReadyVoice ? (
          <p className={mc.cardHeaderSubtitle}>
            Используется ваш последний верифицированный образец Suno Voice (модель V5).
          </p>
        ) : null}

        <section className={mp.sectionCard}>
          {wizardStep === "lyrics" ? (
            <MusicCreateLyricsStep
              configured={configured}
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
