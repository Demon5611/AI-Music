"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { parseApiError } from "@/shared/lib/parse-api-error";
import { usePollingQuery } from "@/shared/hooks/use-polling-query";
import { useApi } from "@/shared/providers/api-provider";
import type { MusicStatusResponseDto } from "@ai-music/shared";

const POLL_INTERVAL_MS = 12_000;

const PARSE_OPTS = {
  includeUnauthorized: true,
  includeServerHint: true,
} as const;

export interface GenerateSongInput {
  prompt: string;
  style: string;
  title: string;
  durationSec: number;
  vocalGender: "m" | "f";
  voiceSampleId: string | null;
}

function isMusicStatusTerminal(data: MusicStatusResponseDto | undefined): boolean {
  return !data || data.status === "completed" || data.status === "failed";
}

export function useMusicGeneration() {
  const api = useApi();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [statusLoadError, setStatusLoadError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [activePollTaskId, setActivePollTaskId] = useState<string | null>(null);
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
    intervalMs: POLL_INTERVAL_MS,
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
      void refreshHistory();

      if (body.status === "failed") {
        setError(body.errorMessage ?? "Music generation failed");
      }
    }
  }, [statusQuery.data, statusQuery.error, refreshHistory]);

  const generate = useCallback(
    async (input: GenerateSongInput) => {
      setError(null);
      setIsGenerating(true);
      setStatus(null);
      setTaskId(null);
      setActivePollTaskId(null);

      try {
        const body = await api.music.generate({
          prompt: input.prompt,
          style: input.style,
          title: input.title,
          customMode: true,
          instrumental: false,
          durationSec: input.durationSec > 0 ? input.durationSec : undefined,
          vocalGender: input.vocalGender,
          voiceSampleId: input.voiceSampleId ?? undefined,
        });

        setTaskId(body.taskId);
        setStatus({
          recordId: body.recordId,
          taskId: body.taskId,
          status: "pending",
          provider: body.provider,
          rawStatus: "PENDING",
        });
        setActivePollTaskId(body.taskId);
      } catch (generateError) {
        setError(parseApiError(generateError, "Music API error", PARSE_OPTS));
      } finally {
        setIsGenerating(false);
      }
    },
    [api],
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
