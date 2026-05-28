"use client";

import { useState } from "react";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface AiCommandPanelProps {
  disabled: boolean;
  onSubmit: (prompt: string) => Promise<void>;
  lastExplanation?: string | null;
}

export function AiCommandPanel({
  disabled,
  onSubmit,
  lastExplanation,
}: AiCommandPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!prompt.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(prompt.trim());
      setPrompt("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>AI command (strict JSON)</h3>
      <p className={styles.panelHint}>
        Примеры: «сделай голос тише», «убрать вокал», «split», «fade in»
      </p>
      <textarea
        className={styles.aiPrompt}
        disabled={disabled || isSubmitting}
        placeholder="Опишите изменение для выбранного региона..."
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <button
        className={styles.primaryButton}
        disabled={disabled || isSubmitting || !prompt.trim()}
        type="button"
        onClick={() => void handleSubmit()}
      >
        {isSubmitting ? "Применяем..." : "Применить AI-команду"}
      </button>
      {lastExplanation ? (
        <p className={styles.panelHint}>{lastExplanation}</p>
      ) : null}
    </div>
  );
}
