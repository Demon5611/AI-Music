"use client";

import type { EditOperation } from "@ai-music/shared";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface EditHistoryPanelProps {
  operations: EditOperation[];
}

function formatOperation(operation: EditOperation): string {
  switch (operation.type) {
    case "SET_VOLUME":
      return `${operation.trackId}: volume ${operation.gainDb} dB`;
    case "MUTE_TRACK":
      return `${operation.trackId}: ${operation.muted ? "mute" : "unmute"}`;
    case "FADE":
      return `${operation.trackId}: fade ${operation.fadeType}`;
    case "SPLIT_REGION":
      return `split @ ${operation.splitAtMs} ms`;
    case "DUPLICATE_REGION":
      return "duplicate region";
    case "MOVE_REGION":
      return `move to index ${operation.targetIndex}`;
    case "CUT_REGION":
      return "cut region";
    case "REPLACE_VOCAL":
      return `replace vocal (model ${operation.voiceModelId})`;
    case "REGENERATE_REGION":
      return "regenerate region";
  }
}

export function EditHistoryPanel({ operations }: EditHistoryPanelProps) {
  if (operations.length === 0) {
    return (
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Edit history</h3>
        <p className={styles.panelHint}>Операции появятся здесь после первого изменения.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Edit history</h3>
      <ul className={styles.historyList}>
        {operations.map((operation, index) => (
          <li className={styles.historyItem} key={`${operation.type}-${index}`}>
            {formatOperation(operation)}
          </li>
        ))}
      </ul>
    </div>
  );
}
