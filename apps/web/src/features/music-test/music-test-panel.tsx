"use client";

import { ApiError } from "@ai-music/api-client";
import type { MusicStatusResponseDto } from "@ai-music/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MusicGenerationLoader } from "@/features/music-test/music-generation-loader";
import { MusicHistoryPanel } from "@/features/music-test/music-history-panel";
import { mt } from "@/features/music-test/music-test-classes";
import { MusicLyricsFromPrompt } from "@/features/music-test/music-lyrics-from-prompt";
import { MusicStyleChips } from "@/features/music-test/music-style-chips-panel";
import { SongTrackResult } from "@/features/music-test/song-track-result";
import { useAuthReady } from "@/shared/hooks/use-auth-ready";
import { useApi } from "@/shared/providers/api-provider";
import { cn } from "@/lib/utils";

const DEFAULT_PROMPT = "Upbeat pop song about summer and friends, male vocals in Russian";
const DEFAULT_STYLE = "electro house vocal";
const DEFAULT_TITLE = "Summer Friends";
const POLL_INTERVAL_MS = 12_000;

const PROMPT_MAX_LENGTH = 500;
const STYLE_MAX_LENGTH = 200;
const LYRICS_MAX_LENGTH = 3000;
const TITLE_MAX_LENGTH = 100;

const DURATION_OPTIONS = [
  { value: 0, label: "Auto (~2–3 мин)" },
  { value: 30, label: "~30 сек" },
  { value: 60, label: "~1 мин" },
  { value: 120, label: "~2 мин" },
] as const;

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

export function MusicTestPanel() {
  const api = useApi();
  const authReady = useAuthReady();
  const queryClient = useQueryClient();

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusLoadError, setStatusLoadError] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<MusicStatusResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [isDeletingTrack, setIsDeletingTrack] = useState(false);
  const [isOpeningEditor, setIsOpeningEditor] = useState(false);
  const [openingEditorTrackId, setOpeningEditorTrackId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const historyQuery = useQuery({
    queryKey: ["music-history"],
    queryFn: () => api.music.history(),
    enabled: authReady,
  });

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
        style: customMode ? style : undefined,
        title: customMode ? title : undefined,
        customMode,
        instrumental: false,
        durationSec: durationSec > 0 ? durationSec : undefined,
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

  async function handleDeleteHistory(ids: string[]) {
    setIsDeletingHistory(true);
    setError(null);

    try {
      await api.music.deleteHistory(ids);
      await refreshHistory();
    } catch (deleteError) {
      setError(resolveErrorMessage(deleteError));
    } finally {
      setIsDeletingHistory(false);
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

  const handleApplyGeneratedLyrics = useCallback(
    (text: string, suggestedTitle?: string) => {
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
          <span className={mt.pageHeaderTitle}>Magic Music</span>
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

        <section className={mt.sectionCard}>
          <div className={mt.cardHeader}>
            <div>
              <h2 className={mt.cardHeaderTitle}>Создать трек</h2>
              <p className={mt.cardHeaderSubtitle}>
                {customMode
                  ? "Укажите стиль, текст и название — AI споёт вашу песню"
                  : "AI напишет текст и музыку за вас"}
              </p>
            </div>
            {customMode ? (
              <button
                aria-pressed="true"
                className={mt.modeToggleActive}
                type="button"
                onClick={() => setCustomMode(false)}
              >
                <IconWand />
                Пользовательский
              </button>
            ) : (
              <button
                aria-pressed="false"
                className={mt.modeToggle}
                type="button"
                onClick={() => setCustomMode(true)}
              >
                <IconWand />
                Авто режим
              </button>
            )}
          </div>

          <div className={mt.fieldStack}>
            {customMode ? (
              <>
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
                      placeholder="pop, hyperpop, soft female vocals, 120 BPM"
                      value={style}
                      onChange={(event) => setStyle(event.target.value)}
                    />
                    <div className={mt.counterPos}>
                      <CharCounter current={style.length} max={STYLE_MAX_LENGTH} />
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className={mt.fieldLabel}>Введи текст песни и его споет AI</span>
                  <div className="relative">
                    <textarea
                      className={mt.textareaLarge}
                      maxLength={LYRICS_MAX_LENGTH}
                      placeholder="Напишите собственные тексты, или куплеты (8 строк) для лучшего результата"
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                    />
                    <div className={mt.counterPosLarge}>
                      <CharCounter current={prompt.length} max={LYRICS_MAX_LENGTH} />
                    </div>
                  </div>
                </label>

                <MusicLyricsFromPrompt
                  configured={configured === true}
                  disabled={isBusy}
                  onApply={handleApplyGeneratedLyrics}
                />
              </>
            ) : (
              <label className="block">
                <span className={mt.fieldLabel}>
                  Опишите тему, настроение и стиль — текст и музыку AI создаст автоматически
                </span>
                <div className="relative">
                  <textarea
                    className={cn(mt.textarea, mt.textareaPrompt)}
                    maxLength={PROMPT_MAX_LENGTH}
                    placeholder="Опишите стиль музыки и тему, которую вы хотите, и ИИ создаст текст песни"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                  />
                  <div className={mt.counterPosLarge}>
                    <CharCounter current={prompt.length} max={PROMPT_MAX_LENGTH} />
                  </div>
                </div>
              </label>
            )}

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
                  {customMode
                    ? "AI не гарантирует точную длительность — подсказка добавляется в поле «Стиль музыки». Для коротких треков (~30 сек) используйте краткий стиль и короткие тексты."
                    : "AI не гарантирует точную длительность — подсказка добавляется в описание песни. Для ~30 сек лучше короткое описание."}
                </p>
              ) : null}
            </label>

            <button
              className={mt.submit}
              disabled={isBusy || configured !== true}
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

        <section className={mt.sectionCard}>
          <div className={mt.historyCardHeader}>
            <IconClock />
            <h2 className={mt.cardHeaderTitle}>История генераций</h2>
          </div>
          <MusicHistoryPanel
            isDeleting={isDeletingHistory || isDeletingTrack}
            isLoading={historyQuery.isLoading}
            items={historyQuery.data ?? []}
            openingEditorTrackId={openingEditorTrackId}
            onDelete={handleDeleteHistory}
            onDeleteTrack={handleDeleteTrack}
            onOpenEditor={(id) => void handleOpenEditor(id)}
          />
        </section>
      </main>
    </div>
  );
}
