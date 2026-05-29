"use client";

import type { AgentState } from "@/components/ui/orb";
import { Orb } from "@/components/ui/orb";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import styles from "@/shared/ui/elevenlabs/elevenlabs-ui.module.css";

interface AiProcessingStatusProps {
  label: string;
  progress?: number;
  agentState?: AgentState;
  meta?: string;
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
