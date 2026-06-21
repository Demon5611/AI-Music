"use client";

import { parseApiError } from "@/shared/lib/parse-api-error";
import type { MusicLyricsStatusResponseDto, VocalGender } from "@ai-music/shared";
import {
  buildVoiceRecordingScriptPrompt,
  VOICE_RECORDING_SCRIPT_DURATION_SEC,
} from "@ai-music/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePollingQuery } from "@/shared/hooks/use-polling-query";
import { useApi } from "@/shared/providers/api-provider";

const SCRIPT_POLL_INTERVAL_MS = 3_000;

function isScriptStatusTerminal(data: MusicLyricsStatusResponseDto | undefined): boolean {
  return !data || data.status === "completed" || data.status === "failed";
}

export function useVoiceRecordingScript(vocalGender: VocalGender | null) {
  const api = useApi();
  const [script, setScript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const lastGenderRef = useRef<VocalGender | null>(null);

  const statusQuery = usePollingQuery({
    queryKey: ["voice-recording-script", taskId, VOICE_RECORDING_SCRIPT_DURATION_SEC],
    queryFn: () =>
      api.music.lyricsStatus(taskId!, VOICE_RECORDING_SCRIPT_DURATION_SEC),
    enabled: Boolean(taskId),
    isTerminal: isScriptStatusTerminal,
    intervalMs: SCRIPT_POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (statusQuery.error) {
      setError(parseApiError(statusQuery.error, "Не удалось сгенерировать текст"));
      setTaskId(null);
      return;
    }

    const body = statusQuery.data;
    if (!body || body.status === "pending" || body.status === "processing") {
      return;
    }

    setTaskId(null);

    if (body.status === "failed") {
      setError(body.errorMessage ?? "Генерация текста не удалась");
      return;
    }

    const text = body.lyrics?.[0]?.text?.trim();
    if (!text) {
      setError("AI не вернул текст для записи");
      return;
    }

    setScript(text);
    setError(null);
  }, [statusQuery.data, statusQuery.error]);

  const generateScript = useCallback(async () => {
    if (!vocalGender) {
      setError("Выберите пол");
      return;
    }

    setError(null);
    setIsStarting(true);

    try {
      const prompt = buildVoiceRecordingScriptPrompt();
      const body = await api.music.generateLyrics({
        prompt,
        durationSec: VOICE_RECORDING_SCRIPT_DURATION_SEC,
      });
      setTaskId(body.taskId);
      lastGenderRef.current = vocalGender;
    } catch (generateError) {
      setError(parseApiError(generateError, "Не удалось сгенерировать текст"));
    } finally {
      setIsStarting(false);
    }
  }, [api.music, vocalGender]);

  useEffect(() => {
    if (!vocalGender) {
      setScript(null);
      setTaskId(null);
      setError(null);
      lastGenderRef.current = null;
      return;
    }

    if (lastGenderRef.current !== vocalGender) {
      setScript(null);
      setTaskId(null);
      setError(null);
    }
  }, [vocalGender]);

  const isGenerating = isStarting || Boolean(taskId);

  return {
    error,
    generateScript,
    isGenerating,
    script,
  };
}
