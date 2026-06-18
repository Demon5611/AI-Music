"use client";

import { useEffect, useState } from "react";
import { AiProcessingStatus, LoadingPanel } from "@/shared/ui/elevenlabs";

const WAIT_HINT = "Обычно требуется около 1 минуты — не закрывайте страницу.";
const EXPECTED_WAIT_SEC = 60;

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

interface VoiceCloneWaitingPanelProps {
  active: boolean;
  label: string;
}

function VoiceCloneWaitingPanelContent({ active, label }: VoiceCloneWaitingPanelProps) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedSec(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedSec((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [active]);

  const progress = Math.min(95, Math.round((elapsedSec / EXPECTED_WAIT_SEC) * 100));
  const slowHint =
    elapsedSec >= 120
      ? "Suno отвечает дольше обычного. Если прошло больше 5 минут — нажмите «Повторить верификацию»."
      : WAIT_HINT;

  return (
    <AiProcessingStatus
      agentState="thinking"
      label={label}
      progress={progress}
      meta={`${slowHint} Прошло: ${formatElapsed(elapsedSec)}.`}
    />
  );
}

export function VoiceCloneWaitingPanel({ active, label }: VoiceCloneWaitingPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingPanel lines={2} />;
  }

  return <VoiceCloneWaitingPanelContent active={active} label={label} />;
}
