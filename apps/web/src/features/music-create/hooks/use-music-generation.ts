"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { parseApiError } from "@/shared/lib/parse-api-error";
import { usePollingQuery } from "@/shared/hooks/use-polling-query";
import { useApi } from "@/shared/providers/api-provider";
import { invalidateCreditsBalance } from "@/features/billing/hooks/invalidate-credits-balance";
import { checkContentAllowed, type MusicStatusResponseDto } from "@ai-music/shared";

const POLL_INTERVAL_FAST_MS = 4_000;
const POLL_INTERVAL_DEFAULT_MS = 12_000;
const POLL_FAST_PHASE_MS = 90_000;

const PARSE_OPTS = {
  includeUnauthorized: true,
  includeServerHint: true,
} as const;

export interface GenerateSongInput {
  prompt: string;
  style: string;
  title: string;
  durationSec: number;
  voiceSampleId: string | null;
}

function isMusicStatusTerminal(data: MusicStatusResponseDto | undefined): boolean {
  return !data || data.status === "completed" || data.status === "failed";
}

function resolveInputModerationError(input: GenerateSongInput): string | null {
  const checks = [input.prompt, input.style, input.title];

  for (const value of checks) {
    const moderationResult = checkContentAllowed(value);
    if (!moderationResult.allowed) {
      return moderationResult.reasonMessageRu;
    }
  }

  return null;
}

export function useMusicGeneration() {
  const api = useApi();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusLoadError, setStatusLoadError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [activePollTaskId, setActivePollTaskId] = useState<string | null>(null);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<MusicStatusResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeletingTrack, setIsDeletingTrack] = useState(false);
  const [isOpeningEditor, setIsOpeningEditor] = useState(false);
  const [openingEditorTrackId, setOpeningEditorTrackId] = useState<string | null>(null);

  useEffect(() => {
    void api.music
      .getTestStatus()
      .then((body) => {
        setConfigured(Boolean(body.configured));
        setStatusLoadError(null);
      })
      .catch((loadError) => {
        setConfigured(null);
        setStatusLoadError(
          parseApiError(loadError, "Music API error", PARSE_OPTS),
        );
      });
  }, [api]);

  const refreshHistory = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["music-history"] });
  }, [queryClient]);

  const statusQuery = usePollingQuery({
    queryKey: ["music-status", activePollTaskId],
    queryFn: () => api.music.status(activePollTaskId!),
    enabled: Boolean(activePollTaskId),
    isTerminal: isMusicStatusTerminal,
    intervalMs: POLL_INTERVAL_DEFAULT_MS,
    resolveIntervalMs: (data) => {
      if (!pollStartedAt) {
        return POLL_INTERVAL_DEFAULT_MS;
      }

      const elapsedMs = Date.now() - pollStartedAt;
      const hasStreamProgress =
        data?.rawStatus === "FIRST_SUCCESS" ||
        data?.rawStatus === "TEXT_SUCCESS" ||
        Boolean(data?.tracks?.some((track) => track.audioUrl));

      if (hasStreamProgress || elapsedMs >= POLL_FAST_PHASE_MS) {
        return POLL_INTERVAL_DEFAULT_MS;
      }

      return POLL_INTERVAL_FAST_MS;
    },
  });

  useEffect(() => {
    if (statusQuery.error) {
      setError(parseApiError(statusQuery.error, "Music API error", PARSE_OPTS));
      setActivePollTaskId(null);
      return;
    }

    const body = statusQuery.data;
    if (!body) {
      return;
    }

    setStatus(body);

    if (body.status === "completed" || body.status === "failed") {
      setActivePollTaskId(null);
      void queryClient.invalidateQueries({ queryKey: ["music-history"] });

      if (body.status === "failed") {
        void invalidateCreditsBalance(queryClient);
        setError(body.errorMessage ?? "Music generation failed");
      }
    }
  }, [queryClient, statusQuery.data, statusQuery.error]);

  const generate = useCallback(
    async (input: GenerateSongInput) => {
      const moderationError = resolveInputModerationError(input);
      if (moderationError) {
        setError(moderationError);
        return;
      }

      setError(null);
      setIsGenerating(true);
      setStatus(null);
      setTaskId(null);
      setActivePollTaskId(null);
      setPollStartedAt(null);

      try {
        const voiceSampleId = input.voiceSampleId ?? undefined;

        const body = await api.music.generate({
          prompt: input.prompt,
          style: input.style,
          title: input.title,
          customMode: true,
          instrumental: false,
          durationSec: input.durationSec > 0 ? input.durationSec : undefined,
          voiceSampleId,
        });

        setTaskId(body.recordId);
        setStatus({
          recordId: body.recordId,
          taskId: body.recordId,
          status: "pending",
          provider: body.provider,
          rawStatus: "PENDING",
        });
        setActivePollTaskId(body.recordId);
        setPollStartedAt(Date.now());
        void invalidateCreditsBalance(queryClient);
      } catch (generateError) {
        setError(parseApiError(generateError, "Music API error", PARSE_OPTS));
      } finally {
        setIsGenerating(false);
      }
    },
    [api, queryClient],
  );

  const openEditor = useCallback(
    async (trackId: string) => {
      setIsOpeningEditor(true);
      setOpeningEditorTrackId(trackId);
      setError(null);

      try {
        const result = await api.musicEditor.initEditor(trackId);
        router.push(`/music-editor/${result.songId}`);
      } catch (editorError) {
        setError(parseApiError(editorError, "Music API error", PARSE_OPTS));
      } finally {
        setIsOpeningEditor(false);
        setOpeningEditorTrackId(null);
      }
    },
    [api, router],
  );

  const deleteTrack = useCallback(
    async (trackId: string) => {
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
        setError(parseApiError(deleteError, "Music API error", PARSE_OPTS));
      } finally {
        setIsDeletingTrack(false);
      }
    },
    [api, refreshHistory],
  );

  const isPolling = Boolean(activePollTaskId);

  return {
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
    isBusy: isGenerating || isPolling,
    songTracks: status?.tracks ?? [],
    generate,
    openEditor,
    deleteTrack,
  };
}
