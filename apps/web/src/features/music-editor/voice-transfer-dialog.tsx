"use client";

import type { KitsVoiceModel } from "@ai-music/shared";
import { useEffect, useState } from "react";
import { useApi } from "@/shared/providers/api-provider";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface VoiceTransferDialogProps {
  open: boolean;
  disabled: boolean;
  onClose: () => void;
  onConfirm: (voiceModelId: number) => Promise<void>;
}

export function VoiceTransferDialog({
  open,
  disabled,
  onClose,
  onConfirm,
}: VoiceTransferDialogProps) {
  const api = useApi();
  const [models, setModels] = useState<KitsVoiceModel[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [manualId, setManualId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
  
    let cancelled = false;
  
    void Promise.resolve().then(async () => {
      if (cancelled) return;
  
      setIsLoading(true);
      setError(null);
  
      try {
        const response = await api.kits.listVoiceModels({
          myModels: true,
          perPage: 20,
        });
        if (cancelled) return;
        setModels(response.data ?? []);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить voice models",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    });
  
    return () => {
      cancelled = true;
    };
  }, [api, open]);

  if (!open) {
    return null;
  }

  async function handleConfirm() {
    const voiceModelId = Number(selectedId || manualId);

    if (!Number.isFinite(voiceModelId) || voiceModelId <= 0) {
      setError("Укажите voice model id");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(voiceModelId);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Voice transfer failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop}>
      <div className={styles.dialogCard}>
        <h3 className={styles.panelTitle}>Заменить вокал (Kits)</h3>
        {isLoading ? <p className={styles.panelHint}>Загрузка моделей...</p> : null}
        {models.length > 0 ? (
          <label className={styles.fieldLabel}>
            Voice model
            <select
              className={styles.selectInput}
              disabled={disabled || isSubmitting}
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">Выберите модель</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.title} (#{model.id})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className={styles.fieldLabel}>
          Или введите Kits voice model id
          <input
            className={styles.textInput}
            disabled={disabled || isSubmitting}
            placeholder="1014961"
            value={manualId}
            onChange={(event) => setManualId(event.target.value)}
          />
        </label>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.dialogActions}>
          <button
            className={styles.toolButton}
            disabled={isSubmitting}
            type="button"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className={styles.primaryButton}
            disabled={disabled || isSubmitting}
            type="button"
            onClick={() => void handleConfirm()}
          >
            {isSubmitting ? "Конвертация..." : "Заменить вокал"}
          </button>
        </div>
      </div>
    </div>
  );
}
