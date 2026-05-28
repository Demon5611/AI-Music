"use client";

import type { SongVersionDto } from "@ai-music/shared";
import { AuthenticatedAudio } from "@/shared/ui/authenticated-audio";
import { Tooltip } from "@/shared/ui/tooltip";
import { DownloadAudioButton } from "@/features/music-editor/download-audio-button";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface RenderButtonProps {
  disabled: boolean;
  isRendering: boolean;
  songTitle: string;
  versions: SongVersionDto[];
  onRender: () => void;
}

export function RenderButton({
  disabled,
  isRendering,
  songTitle,
  versions,
  onRender,
}: RenderButtonProps) {
  const latestRendered = versions.find(
    (version) => version.status === "completed" && version.renderedAudioUrl,
  );

  return (
    <Tooltip
      block
      content="Финальный render применит все операции и создаст новую версию трека"
    >
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Render version</h3>
        <p className={styles.panelHint}>
          Создайте новую аудиоверсию со всеми изменениями. Оригинал не будет
          перезаписан.
        </p>

        <Tooltip content="Создать новую версию, не изменяя оригинал">
          <button
            className={styles.primaryButton}
            disabled={disabled || isRendering}
            type="button"
            onClick={onRender}
          >
            {isRendering ? "Rendering..." : "Render version"}
          </button>
        </Tooltip>

        {latestRendered?.renderedAudioUrl ? (
          <div className={styles.renderResult}>
            <p className={styles.panelHint}>
              Version {latestRendered.versionNumber} ready
            </p>
            <AuthenticatedAudio
              className={styles.player}
              src={latestRendered.renderedAudioUrl}
            />
            <Tooltip content="Скачать готовый MP3">
              <DownloadAudioButton
                audioUrl={latestRendered.renderedAudioUrl}
                filename={`${songTitle}-v${latestRendered.versionNumber}.mp3`}
                label="Download MP3"
              />
            </Tooltip>
          </div>
        ) : null}
      </div>
    </Tooltip>
  );
}
