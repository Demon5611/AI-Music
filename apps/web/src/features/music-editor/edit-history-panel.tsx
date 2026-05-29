"use client";

import type { EditOperation } from "@ai-music/shared";
import { Tooltip } from "@/shared/ui/tooltip";
import {
  selectRegionLabel,
  useAudioEditorStore,
} from "@/features/music-editor/store/audio-editor-store";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface EditHistoryPanelProps {
  operations: EditOperation[];
  disabled?: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

function formatOperationLabel(
  operation: EditOperation,
  regions: ReturnType<typeof useAudioEditorStore.getState>["regions"],
): string {
  const region = "regionId" in operation
    ? regions.find((item) => item.id === operation.regionId)
    : null;
  const regionLabel = region ? selectRegionLabel(region) : "—";

  switch (operation.type) {
    case "SET_VOLUME":
      return `${operation.trackId} volume ${operation.gainDb} dB — ${regionLabel}`;
    case "MUTE_TRACK":
      return `${operation.trackId} ${operation.muted ? "mute" : "unmute"} — ${regionLabel}`;
    case "FADE":
      return `Fade ${operation.fadeType} — ${regionLabel}`;
    case "SPLIT_REGION":
      return `Split — ${regionLabel}`;
    case "DUPLICATE_REGION":
      return `Duplicate — ${regionLabel}`;
    case "MOVE_REGION":
      return `Move — ${regionLabel}`;
    case "CUT_REGION":
      return `Cut — ${regionLabel}`;
    case "RESIZE_REGION":
      return `Resize — ${regionLabel}`;
    case "REPLACE_VOCAL":
      return `Replace vocal — ${regionLabel}`;
    case "REGENERATE_REGION":
      return `Regenerate — ${regionLabel}`;
  }
}

export function EditHistoryPanel({
  operations,
  disabled = false,
  onUndo,
  onRedo,
}: EditHistoryPanelProps) {
  const regions = useAudioEditorStore((state) => state.regions);
  const undoneOperations = useAudioEditorStore((state) => state.undoneOperations);
  const setSelectedRegion = useAudioEditorStore((state) => state.setSelectedRegion);

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Edit history</h3>

      {operations.length === 0 ? (
        <p className={styles.panelHint}>
          Операции появятся здесь после первого изменения
        </p>
      ) : (
        <ol className={styles.historyList}>
          {operations.map((operation, index) => {
            const regionId = "regionId" in operation ? operation.regionId : null;

            return (
              <li className={styles.historyItem} key={`${operation.type}-${index}`}>
                <Tooltip content="Кликните, чтобы перейти к фрагменту, который был изменен">
                  <button
                    className={styles.historyButton}
                    type="button"
                    onClick={() => {
                      if (regionId) {
                        setSelectedRegion(regionId);
                      }
                    }}
                  >
                    {index + 1}. {formatOperationLabel(operation, regions)}
                  </button>
                </Tooltip>
              </li>
            );
          })}
        </ol>
      )}

      <div className={styles.toolbarRow}>
        <Tooltip content="Отменить последнее изменение">
          <button
            className={styles.toolButton}
            disabled={disabled || operations.length === 0}
            type="button"
            onClick={onUndo}
          >
            Undo
          </button>
        </Tooltip>
        <Tooltip content="Вернуть отмененное изменение">
          <button
            className={styles.toolButton}
            disabled={disabled || undoneOperations.length === 0}
            type="button"
            onClick={onRedo}
          >
            Redo
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
