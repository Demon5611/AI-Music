"use client";

import { Tooltip } from "@/shared/ui/tooltip";
import { formatTimeMs } from "@/features/music-editor/utils/format-time";
import { useAudioEditorStore } from "@/features/music-editor/store/audio-editor-store";
import { me } from "@/features/music-editor/music-editor-classes";

interface TransportControlsProps {
  disabled?: boolean;
}

export function TransportControls({ disabled = false }: TransportControlsProps) {
  const isPlaying = useAudioEditorStore((state) => state.isPlaying);
  const currentTimeMs = useAudioEditorStore((state) => state.currentTimeMs);
  const durationMs = useAudioEditorStore((state) => state.durationMs);
  const loopSelected = useAudioEditorStore((state) => state.loopSelected);
  const selectedRegionId = useAudioEditorStore((state) => state.selectedRegionId);
  const togglePlay = useAudioEditorStore((state) => state.togglePlay);
  const stop = useAudioEditorStore((state) => state.stop);
  const toggleLoopSelected = useAudioEditorStore((state) => state.toggleLoopSelected);
  const setZoom = useAudioEditorStore((state) => state.setZoom);
  const zoom = useAudioEditorStore((state) => state.zoom);

  return (
    <div className={me.transportBar}>
      <Tooltip content="Воспроизвести или поставить трек на паузу (Space)">
        <button
          className={me.transportButton}
          disabled={disabled}
          type="button"
          onClick={togglePlay}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </Tooltip>

      <Tooltip content="Остановить и вернуться в начало">
        <button
          className={me.transportButton}
          disabled={disabled}
          type="button"
          onClick={stop}
        >
          Stop
        </button>
      </Tooltip>

      <Tooltip content="Зациклить выбранный фрагмент">
        <button
          className={
            loopSelected ? me.transportButtonActive : me.transportButton
          }
          disabled={disabled || !selectedRegionId}
          type="button"
          onClick={toggleLoopSelected}
        >
          Loop selected
        </button>
      </Tooltip>

      <span className={me.transportTime}>
        {formatTimeMs(currentTimeMs)} / {formatTimeMs(durationMs)}
      </span>

      <div className={me.transportZoom}>
        <Tooltip content="Уменьшить масштаб timeline">
          <button
            className={me.transportButton}
            disabled={disabled}
            type="button"
            onClick={() => setZoom(zoom - 10)}
          >
            Zoom -
          </button>
        </Tooltip>
        <Tooltip content="Увеличить масштаб timeline">
          <button
            className={me.transportButton}
            disabled={disabled}
            type="button"
            onClick={() => setZoom(zoom + 10)}
          >
            Zoom +
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
