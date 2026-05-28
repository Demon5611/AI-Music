"use client";

import { useState } from "react";
import { Tooltip } from "@/shared/ui/tooltip";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface AiCommandPanelProps {
  disabled: boolean;
  onPreview: (prompt: string) => Promise<void>;
  onConfirm: () => Promise<void>;
  onCancelPreview: () => void;
  lastExplanation?: string | null;
}

const AI_PRESETS: Array<{ label: string; text: string }> = [
  { label: "Сделать голос тише", text: "сделай голос тише" },
  { label: "Сделать музыку тише", text: "сделай музыку тише" },
  { label: "Убрать вокал", text: "убрать вокал" },
  { label: "Fade out", text: "fade out" },
  { label: "Split", text: "split" },
  { label: "Продлить после этого места", text: "продлить после этого места" },
];

export function AiCommandPanel({
  disabled,
  onPreview,
  onConfirm,
  onCancelPreview,
  lastExplanation,
}: AiCommandPanelProps) {
  const aiCommandText = useAudioEditorStore((state) => state.aiCommandText);
  const aiCommandPreview = useAudioEditorStore((state) => state.aiCommandPreview);
  const setAiCommandText = useAudioEditorStore((state) => state.setAiCommandText);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handlePreview() {
    if (!aiCommandText.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onPreview(aiCommandText.trim());
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm() {
    setIsSubmitting(true);

    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (

      <div className={styles.panel}>
      <Tooltip content="Опишите изменение простыми словами. AI не меняет трек напрямую, а создает безопасную команду">
          <h3 className={styles.panelTitle}>AI action assistant</h3>
          </Tooltip>
        <p className={styles.panelHint}>
          AI преобразует ваш запрос в безопасную JSON-операцию для выбранного
          фрагмента
        </p>
          <div className={styles.presetRow}>
            {AI_PRESETS.map((preset) => (
              <button
                className={styles.presetChip}
                disabled={disabled || isSubmitting}
                key={preset.label}
                type="button"
                onClick={() => setAiCommandText(preset.text)}
              >
                {preset.label}
              </button>
            ))}
          </div>

        <textarea
          className={styles.aiPrompt}
          disabled={disabled || isSubmitting}
          placeholder="Опишите изменение для выбранного региона..."
          value={aiCommandText}
          onChange={(event) => setAiCommandText(event.target.value)}
        />

          <button
            className={styles.primaryButton}
            disabled={disabled || isSubmitting || !aiCommandText.trim()}
            type="button"
            onClick={() => void handlePreview()}
          >
            {isSubmitting && !aiCommandPreview
              ? "Анализируем..."
              : "Применить AI-команду"}
          </button>

        {lastExplanation ? (
          <p className={styles.panelHint}>{lastExplanation}</p>
        ) : null}

        {aiCommandPreview ? (
          <Tooltip content="Проверьте, что именно будет изменено перед применением">
            <div className={styles.jsonPreviewBlock}>
              <p className={styles.toolbarSectionTitle}>JSON preview</p>
              <pre className={styles.jsonPreview}>
                {JSON.stringify(aiCommandPreview, null, 2)}
              </pre>
              <div className={styles.dialogActions}>
                <button
                  className={styles.toolButton}
                  disabled={isSubmitting}
                  type="button"
                  onClick={onCancelPreview}
                >
                  Cancel
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                  type="button"
                  onClick={() => void handleConfirm()}
                >
                  Apply operation
                </button>
              </div>
            </div>
          </Tooltip>
        ) : null}
      </div>
  );
}
