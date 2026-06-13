"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import type { AgentState } from "@/shared/ui/elevenlabs/agent-state";
import styles from "@/shared/ui/elevenlabs/elevenlabs-ui.module.css";

const Orb = dynamic(
  () => import("@/components/ui/orb").then((module) => module.Orb),
  {
    ssr: false,
    loading: () => <div className={styles.orbPlaceholder} />,
  },
);

interface AiProcessingStatusProps {
  label: string;
  progress?: number;
  agentState?: AgentState;
  meta?: ReactNode;
}

export function AiProcessingStatus({
  label,
  progress,
  agentState = "thinking",
  meta,
}: AiProcessingStatusProps) {
  return (
    <div className={styles.aiStatusCard}>
      <div className={styles.orbContainer}>
        <Orb agentState={agentState} seed={42} />
      </div>

      <p className={styles.statusLabel}>
        <ShimmeringText text={label} />
      </p>

      {progress !== undefined ? (
        <div className={styles.progressBlock}>
          <Progress value={progress}>
            <ProgressLabel>Прогресс</ProgressLabel>
            <ProgressValue />
          </Progress>
        </div>
      ) : null}

      {meta ? <p className={styles.meta}>{meta}</p> : null}
    </div>
  );
}
