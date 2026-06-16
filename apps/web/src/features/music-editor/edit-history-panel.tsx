"use client";

import type { EditOperation } from "@ai-music/shared";
import { Tooltip } from "@/shared/ui/tooltip";
import {
  selectRegionLabel,
  useAudioEditorStore,
} from "@/features/music-editor/store/audio-editor-store";
import { me } from "@/features/music-editor/music-editor-classes";

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
  const region =
    "regionId" in operation ? regions.find((item) => item.id === operation.regionId) : null;
  const regionLabel = region ? selectRegionLabel(region) : "—";

  switch (operation.type) {
    case "SET_VOLUME":
      return `${operation.trackId} volume ${operation.gainDb} dB — ${regionLabel}`;
    case "MUTE_TRACK":
      return `${operation.trackId} ${operation.muted ? "mute" : "unmute"} — ${regionLabel}`;
    case "SOLO_TRACK":
      return `${operation.trackId} ${operation.solo ? "solo" : "unsolo"} — ${regionLabel}`;
    case "FADE":
      return `Fade ${operation.fadeType} — ${regionLabel}`;
    case "SPLIT_REGION":
      return `Split — ${regionLabel}`;
    case "DUPLICATE_REGION":
      return `Duplicate — ${regionLabel}`;
    case "MOVE_REGION":
      return `Move — ${regionLabel}`;
    case "MOVE_TRACK_REGION":
      return `Move ${operation.trackId} — ${regionLabel}`;
    case "DELETE_REGION":
      return `Delete — ${regionLabel}`;
    case "DELETE_RANGE":
      return `Delete range — ${regionLabel}`;
    case "RESIZE_REGION":
      return `Resize — ${regionLabel}`;
    case "RESIZE_TRACK_REGION":
      return `Resize ${operation.trackId} — ${regionLabel}`;
    case "REPLACE_VOCAL":
      return `Replace vocal — ${regionLabel}`;
    default:
      return `${operation.type} — ${regionLabel}`;
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
    <div className={me.panel}>
      <h3 className={me.panelTitle}>Edit history</h3>

      {operations.length === 0 ? (
        <p className={me.panelHint}>Операции появятся здесь после первого изменения</p>
      ) : (
        <ol className={me.historyList}>
          {operations.map((operation, index) => {
            const regionId = "regionId" in operation ? operation.regionId : null;

            return (
              <li className={me.historyItem} key={`${operation.type}-${index}`}>
                <Tooltip content="Кликните, чтобы перейти к фрагменту, который был изменен">
                  <button
                    className={me.historyButton}
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

      <div className={me.toolbarRow}>
        <Tooltip content="Отменить последнее изменение">
          <button
            className={me.toolButton}
            disabled={disabled || operations.length === 0}
            type="button"
            onClick={onUndo}
          >
            Undo
          </button>
        </Tooltip>
        <Tooltip content="Вернуть отмененное изменение">
          <button
            className={me.toolButton}
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
