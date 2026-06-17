"use client";

import { ApiError } from "@ai-music/api-client";
import type { MusicStatusResponseDto } from "@ai-music/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { consumeMusicCreateLyricsBriefDraft } from "@/shared/lib/music-create-prompt-transfer";
import { MusicGenerationLoader } from "@/features/music-create/music-generation-loader";
import { mt } from "@/features/music-create/music-create-classes";
import { MusicLyricsFromPrompt } from "@/features/music-create/music-lyrics-from-prompt";
import { MusicStyleChips } from "@/features/music-create/music-style-chips-panel";
import { SongTrackResult } from "@/features/music-create/song-track-result";
import { useVoiceSampleSelection } from "@/features/music-create/use-voice-sample-selection";
import { VoiceSamplePicker } from "@/features/music-create/voice-sample-picker";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { cn } from "@/lib/utils";

const DEFAULT_STYLE = "lo-fi chill, dreamy, soft, warm textures, relaxed";
const DEFAULT_TITLE = "Summer Friends";
const POLL_INTERVAL_MS = 12_000;

const STYLE_MAX_LENGTH = 200;
const LYRICS_MAX_LENGTH = 3000;
const TITLE_MAX_LENGTH = 100;

const DURATION_OPTIONS = [
  { value: 0, label: "Auto (~2–3 мин)" },
  { value: 30, label: "~30 сек" },
  { value: 60, label: "~1 мин" },
  { value: 120, label: "~2 мин" },
] as const;

const VOCAL_GENDER_OPTIONS = [
  { value: "m" as const, label: "Мужской" },
  { value: "f" as const, label: "Женский" },
];

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === "object") {
    const body = error.body as { error?: string };
    if (body.error) {
      return body.error;
    }
  }

  if (error instanceof ApiError && error.status === 401) {
    return "Unauthorized";
  }

  if (error instanceof ApiError && error.status >= 500) {
    return `${error.status} — проверьте, что запущены Docker, API и выполнен pnpm db:push`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Music API error";
}

function IconMusic() {
  return (
    <svg
      aria-hidden="true"
      className={mt.icon}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M9 9l10-3v7M9 9v10m0 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm10-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWand() {
  return (
    <svg
      aria-hidden="true"
      className={mt.icon}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClock() {
  return (
    <svg
      aria-hidden="true"
      className={mt.icon}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg
      aria-hidden="true"
      className={mt.iconSmall}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="m19.5 8.25-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const isNearLimit = current / max > 0.9;

  return (
    <span className={isNearLimit ? mt.charCounterLimit : mt.charCounter}>
      {current}/{max}
    </span>
  );
}

export function MusicCreatePanel() {
  const api = useApi();
  const authReady = useAuthReady();
  const queryClient = useQueryClient();

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusLoadError, setStatusLoadError] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [lyricsBrief, setLyricsBrief] = useState(
    () => consumeMusicCreateLyricsBriefDraft() ?? "",
  );
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [vocalGender, setVocalGender] = useState<"m" | "f">("m");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<MusicStatusResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeletingTrack, setIsDeletingTrack] = useState(false);
  const [isOpeningEditor, setIsOpeningEditor] = useState(false);
  const [openingEditorTrackId, setOpeningEditorTrackId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
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

  useEffect(() => {
    void api.music
      .getTestStatus()
      .then((body) => {
        setConfigured(Boolean(body.configured));
        setStatusLoadError(null);
      })
      .catch((loadError) => {
        setConfigured(null);
        setStatusLoadError(resolveErrorMessage(loadError));
      });
  }, [api]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(
    () => () => {
      stopPolling();
    },
    [stopPolling],
  );

  const refreshHistory = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["music-history"] });
  }, [queryClient]);

  const pollStatus = useCallback(
    async (id: string) => {
      const body = await api.music.status(id);
      setStatus(body);

      if (body.status === "completed" || body.status === "failed") {
        stopPolling();
        await refreshHistory();

        if (body.status === "failed") {
          setError(body.errorMessage ?? "Music generation failed");
        }
      }
    },
    [api, refreshHistory, stopPolling],
  );

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      setIsPolling(true);
      setError(null);

      void pollStatus(id).catch((pollError) => {
        setError(resolveErrorMessage(pollError));
        stopPolling();
      });

      pollTimerRef.current = setInterval(() => {
        void pollStatus(id).catch((pollError) => {
          setError(resolveErrorMessage(pollError));
          stopPolling();
        });
      }, POLL_INTERVAL_MS);
    },
    [pollStatus, stopPolling],
  );

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);
    setStatus(null);
    setTaskId(null);

    try {
      const body = await api.music.generate({
        prompt,
        style,
        title,
        customMode: true,
        instrumental: false,
        durationSec: durationSec > 0 ? durationSec : undefined,
        vocalGender,
        voiceSampleId: selectedVoiceSampleId ?? undefined,
      });

      setTaskId(body.taskId);
      setStatus({
        recordId: body.recordId,
        taskId: body.taskId,
        status: "pending",
        provider: body.provider,
        rawStatus: "PENDING",
      });
      startPolling(body.taskId);
    } catch (generateError) {
      setError(resolveErrorMessage(generateError));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleOpenEditor(trackId: string) {
    setIsOpeningEditor(true);
    setOpeningEditorTrackId(trackId);
    setError(null);

    try {
      const result = await api.musicEditor.initEditor(trackId);
      router.push(`/music-editor/${result.songId}`);
    } catch (editorError) {
      setError(resolveErrorMessage(editorError));
    } finally {
      setIsOpeningEditor(false);
      setOpeningEditorTrackId(null);
    }
  }

  async function handleDeleteTrack(trackId: string) {
    setIsDeletingTrack(true);
    setError(null);

    try {
      await api.music.deleteTrack(trackId);
      setStatus((current) =>
        current
          ? {
              ...current,
              tracks: current.tracks?.filter((track) => track.id !== trackId),
            }
          : current,
      );
      await refreshHistory();
    } catch (deleteError) {
      setError(resolveErrorMessage(deleteError));
    } finally {
      setIsDeletingTrack(false);
    }
  }

  const isBusy = isGenerating || isPolling;
  const songTracks = status?.tracks ?? [];
  const hasLyricsBrief = lyricsBrief.trim().length > 0;
  const hasManualLyrics = prompt.trim().length > 0;

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
      <div className={mt.authLoading}>
        <div className={mt.authLoadingInner}>
          <span aria-hidden="true" className={mt.spinner} />
          Загрузка сессии...
        </div>
      </div>
    );
  }

  return (
    <div className={mt.page}>
      <header className={mt.pageHeader}>
        <div className={mt.pageHeaderBrand}>
          <div className={mt.pageHeaderLogo}>
            <IconMusic />
          </div>
          <span className={mt.pageHeaderTitle}>Music Create</span>
        </div>
      </header>

      <main className={mt.pageMain}>
        {statusLoadError ? (
          <div className={mt.alertError} role="alert">
            Не удалось связаться с API ({statusLoadError}). Запустите{" "}
            <code className={mt.inlineCode}>pnpm dev:api</code> и проверьте NEXT_PUBLIC_API_URL.
          </div>
        ) : null}

        {configured === false ? (
          <div className={mt.alertWarning} role="alert">
            SUNO_API_KEY не настроен. Добавьте ключ в корневой .env и перезапустите API.
          </div>
        ) : null}

        {!isVoiceSamplesLoading && !hasReadyVoice ? (
          <div className={mt.alertWarning} role="alert">
            Нет готовых образцов Suno Voice. Запишите голос на главной и пройдите верификацию —
            без этого песня будет с чужим AI-вокалом.
          </div>
        ) : null}

        {hasReadyVoice ? (
          <p className={mt.cardHeaderSubtitle}>
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

        <section className={mt.sectionCard}>
          <div className={mt.fieldStack}>
            <label className="block">
              <span className={mt.fieldLabel}>Название</span>
              <input
                className={mt.input}
                maxLength={TITLE_MAX_LENGTH}
                placeholder="Введите название"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <div>
              <span className={mt.fieldLabel} id="music-style-label">
                Стиль музыки
              </span>
              <MusicStyleChips
                maxLength={STYLE_MAX_LENGTH}
                showLabel={false}
                value={style}
                onChange={setStyle}
              />
              <div className="relative mt-2">
                <textarea
                  aria-labelledby="music-style-label"
                  className={cn(mt.textarea, mt.textareaStyle)}
                  maxLength={STYLE_MAX_LENGTH}
                  placeholder="pop, hyperpop, upbeat, 120 BPM"
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                />
                <div className={mt.counterPos}>
                  <CharCounter current={style.length} max={STYLE_MAX_LENGTH} />
                </div>
              </div>
            </div>

            <MusicLyricsFromPrompt
              configured={configured === true}
              disabled={isBusy || hasManualLyrics}
              lyricsBrief={lyricsBrief}
              onLyricsBriefChange={handleLyricsBriefChange}
              onApply={handleApplyGeneratedLyrics}
            />

            <p className={mt.lyricsOrDivider} aria-hidden>
              или
            </p>

            <label className="block">
              <span className={mt.fieldLabel}>Введи текст песни и его споет AI</span>
              <div className="relative">
                <textarea
                  className={cn(
                    mt.textareaLarge,
                    (isBusy || hasLyricsBrief) && mt.fieldDisabled,
                  )}
                  disabled={isBusy || hasLyricsBrief}
                  maxLength={LYRICS_MAX_LENGTH}
                  placeholder="Напишите собственные тексты, или куплеты (8 строк) для лучшего результата"
                  value={prompt}
                  onChange={(event) => handleManualLyricsChange(event.target.value)}
                />
                <div className={mt.counterPosLarge}>
                  <CharCounter current={prompt.length} max={LYRICS_MAX_LENGTH} />
                </div>
              </div>
              {hasLyricsBrief && !hasManualLyrics ? (
                <p className={mt.meta}>
                  Очистите описание выше или нажмите «Сгенерировать текст», чтобы заполнить это поле.
                </p>
              ) : null}
            </label>

            {canGenerateWithVoice ? (
              <div>
                <span className={mt.fieldLabel} id="vocal-gender-label">
                  Пол вокала
                </span>
                <div
                  aria-labelledby="vocal-gender-label"
                  className={mt.chipRow}
                  role="radiogroup"
                >
                  {VOCAL_GENDER_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={
                        vocalGender === option.value ? mt.chipSelected : mt.chip
                      }
                    >
                      <input
                        checked={vocalGender === option.value}
                        className={mt.chipInput}
                        name="vocalGender"
                        type="radio"
                        value={option.value}
                        onChange={() => setVocalGender(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="block">
              <span className={mt.fieldLabel}>
                Длительность (AI не всегда точно соблюдает заданную длительность)
              </span>
              <div className={mt.durationWrap}>
                <span aria-hidden="true" className={mt.durationIcon}>
                  <IconClock />
                </span>
                <select
                  className={mt.select}
                  value={durationSec}
                  onChange={(event) => setDurationSec(Number(event.target.value))}
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span aria-hidden="true" className={mt.durationChevron}>
                  <IconChevronDown />
                </span>
              </div>
              {durationSec > 0 ? (
                <p className={mt.meta}>
                  AI не гарантирует точную длительность — подсказка добавляется в поле «Стиль
                  музыки». Для коротких треков (~30 сек) используйте краткий стиль и короткие
                  тексты.
                </p>
              ) : null}
            </label>

            <button
              className={mt.submit}
              disabled={isBusy || configured !== true || !canGenerateWithVoice}
              type="button"
              onClick={() => void handleGenerate()}
            >
              {isGenerating ? (
                <>
                  <span aria-hidden="true" className={mt.submitSpinner} />
                  Запуск...
                </>
              ) : (
                <>
                  <IconWand />
                  Создать музыку
                </>
              )}
            </button>
          </div>

          {isBusy ? (
            <div className={mt.loaderWrap}>
              <MusicGenerationLoader
                isStarting={isGenerating}
                rawStatus={status?.rawStatus}
                status={status?.status}
                taskId={taskId}
              />
            </div>
          ) : null}

          {songTracks.length > 0 ? (
            <div className={mt.tracksList}>
              {songTracks.map((track) =>
                track.audioUrl ? (
                  <SongTrackResult
                    key={track.id}
                    audioUrl={track.audioUrl}
                    canDelete={Boolean(track.canDelete)}
                    durationSec={track.durationSec}
                    isDeleting={isDeletingTrack}
                    isOpeningEditor={isOpeningEditor && openingEditorTrackId === track.id}
                    lyricsText={track.lyricsText}
                    title={track.title}
                    trackId={track.id}
                    onDelete={() => void handleDeleteTrack(track.id)}
                    onOpenEditor={(id) => void handleOpenEditor(id)}
                  />
                ) : null,
              )}
            </div>
          ) : null}

          {taskId && !isPolling ? (
            <p className={mt.taskMeta}>
              taskId={taskId}, status={status?.status ?? "pending"}
              {status?.rawStatus ? `, raw=${status.rawStatus}` : ""}
            </p>
          ) : null}
        </section>

        {error ? (
          <div className={mt.alertError} role="alert">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}
