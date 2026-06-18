"use client";

import { useCallback, useState } from "react";
import { consumeMusicCreateLyricsBriefDraft } from "@/shared/lib/music-create-prompt-transfer";
import { MusicCreateForm } from "@/features/music-create/components/music-create-form";
import { IconMusic } from "@/features/music-create/components/music-create-icons";
import { MusicCreateResults } from "@/features/music-create/components/music-create-results";
import { useMusicGeneration } from "@/features/music-create/hooks/use-music-generation";
import { useVoiceSampleSelection } from "@/features/music-create/hooks/use-voice-sample-selection";
import { mc } from "@/features/music-create/music-create-classes";
import { VoiceSamplePicker } from "@/features/music-create/voice-sample-picker";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { mp } from "@/shared/theme/music-page-classes";

const DEFAULT_STYLE = "lo-fi chill, dreamy, soft, warm textures, relaxed";
const DEFAULT_TITLE = "Summer Friends";

export function MusicCreatePanel() {
  const authReady = useAuthReady();
  const [durationSec, setDurationSec] = useState(0);
  const [lyricsBrief, setLyricsBrief] = useState(
    () => consumeMusicCreateLyricsBriefDraft() ?? "",
  );
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [vocalGender, setVocalGender] = useState<"m" | "f">("m");

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
    samples: voiceSamples,
    selectedId: selectedVoiceSampleId,
    hasReadyVoice,
    canGenerateWithVoice,
    isLoading: isVoiceSamplesLoading,
    loadError: voiceSamplesLoadError,
    setSelectedId: setSelectedVoiceSampleId,
    removeSample,
    deletingSampleId,
    deleteError,
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

        {!isVoiceSamplesLoading && !hasReadyVoice ? (
          <div className={mp.alertWarning} role="alert">
            Нет готовых образцов Suno Voice. Запишите голос на главной и пройдите верификацию —
            без этого песня будет с чужим AI-вокалом.
          </div>
        ) : null}

        {hasReadyVoice ? (
          <p className={mc.cardHeaderSubtitle}>
            Генерация использует выбранный Suno Voice (модель V5). Укажите пол вокала — без этого
            Suno может выбрать голос по стилю трека.
          </p>
        ) : null}

        <VoiceSamplePicker
          deleteError={deleteError}
          deletingSampleId={deletingSampleId}
          isLoading={isVoiceSamplesLoading}
          loadError={voiceSamplesLoadError}
          samples={voiceSamples}
          selectedId={selectedVoiceSampleId}
          onDelete={(sampleId) => void removeSample(sampleId)}
          onSelect={setSelectedVoiceSampleId}
        />

        <section className={mp.sectionCard}>
          <MusicCreateForm
            canGenerateWithVoice={canGenerateWithVoice}
            configured={configured}
            durationSec={durationSec}
            isBusy={isBusy}
            isGenerating={isGenerating}
            lyricsBrief={lyricsBrief}
            prompt={prompt}
            style={style}
            title={title}
            vocalGender={vocalGender}
            voiceSampleId={selectedVoiceSampleId}
            onApplyGeneratedLyrics={handleApplyGeneratedLyrics}
            onDurationChange={setDurationSec}
            onGenerate={(input) => void generate(input)}
            onLyricsBriefChange={handleLyricsBriefChange}
            onManualLyricsChange={handleManualLyricsChange}
            onStyleChange={setStyle}
            onTitleChange={setTitle}
            onVocalGenderChange={setVocalGender}
          />

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
