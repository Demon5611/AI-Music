"use client";

import type { MusicGenerationRecordStatus } from "@ai-music/shared";
import { useEffect, useState } from "react";
import { AiProcessingStatus } from "@/shared/ui/elevenlabs";
import {
  formatElapsedDuration,
  resolveMusicGenerationAgentState,
  resolveMusicGenerationLabel,
  resolveMusicGenerationProgress,
} from "./music-generation-progress";
import styles from "./styles/music-test.module.css";

function ElapsedDuration() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return <>{formatElapsedDuration(elapsed)}</>;
}

interface MusicGenerationLoaderProps {
  rawStatus?: string | null;
  status?: MusicGenerationRecordStatus;
  taskId?: string | null;
  isStarting?: boolean;
}

export function MusicGenerationLoader({
  rawStatus,
  status,
  taskId,
  isStarting = false,
}: MusicGenerationLoaderProps) {
  const active = isStarting || Boolean(taskId);
  const label = resolveMusicGenerationLabel(rawStatus, status, isStarting);
  const progress = resolveMusicGenerationProgress(rawStatus, status, isStarting);
  const agentState = resolveMusicGenerationAgentState(rawStatus);
  const timerKey = isStarting ? "starting" : (taskId ?? "idle");

  const metaParts = ["Обычно 2–3 минуты · не закрывайте страницу"];

  if (taskId && !isStarting) {
    metaParts.push(`ID: ${taskId.slice(0, 8)}…`);
  }

  const metaBase = metaParts.join(" · ");

  return (
    <div className={styles.generationLoader}>
      <AiProcessingStatus
        agentState={agentState}
        label={label}
        meta={
          active ? (
            <>
              {metaBase} · Прошло <ElapsedDuration key={timerKey} />
            </>
          ) : (
            metaBase
          )
        }
        progress={progress}
      />
    </div>
  );
}
