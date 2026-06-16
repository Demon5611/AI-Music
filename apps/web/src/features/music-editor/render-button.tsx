"use client";

import type { SongVersionDto } from "@ai-music/shared";
import { AuthenticatedAudio } from "@/shared/ui/authenticated-audio";
import { Tooltip } from "@/shared/ui/tooltip";
import { DownloadAudioButton } from "@/features/music-editor/download-audio-button";
import { me } from "@/features/music-editor/music-editor-classes";

interface RenderButtonProps {
  disabled: boolean;
  isRendering: boolean;
  renderError: string | null;
  songTitle: string;
  versions: SongVersionDto[];
  onRender: () => void;
}

export function RenderButton({
  disabled,
  isRendering,
  renderError,
  songTitle,
  versions,
  onRender,
}: RenderButtonProps) {
  const latestRendered = versions.find(
    (version) => version.status === "completed" && version.renderedAudioUrl,
  );
  const latestFailedRender = versions.find((version) => version.status === "failed");
  const hasCompletedRender = Boolean(latestRendered?.renderedAudioUrl);

  return (
    <div className={me.panel}>
      <h3 className={me.panelTitle}>Render version</h3>
      <p className={me.panelHint}>
        Создайте новую аудиоверсию со всеми изменениями. Оригинал не будет перезаписан.
      </p>

      <Tooltip content="Создать новую версию, не изменяя оригинал">
        <button
          className={me.primaryButton}
          disabled={disabled || isRendering}
          type="button"
          onClick={onRender}
        >
          {isRendering ? "Rendering..." : "Render version"}
        </button>
      </Tooltip>

      {isRendering ? (
        <p className={me.renderStatus}>Сборка MP3 на сервере, подождите...</p>
      ) : null}

      {renderError ? <p className={me.error}>{renderError}</p> : null}

      {!isRendering && !hasCompletedRender && !renderError ? (
        <p className={me.renderStatus}>
          Готовых версий пока нет. После успешного render здесь появятся плеер и Download MP3.
        </p>
      ) : null}

      {!isRendering && latestFailedRender && !hasCompletedRender && !renderError ? (
        <p className={me.renderStatus}>
          Последний render (v{latestFailedRender.versionNumber}) не удался. Проверьте, что на
          сервере установлен ffmpeg.
        </p>
      ) : null}

      {latestRendered?.renderedAudioUrl ? (
        <div className={me.renderResult}>
          <p className={me.renderStatus}>Version {latestRendered.versionNumber} ready</p>
          <AuthenticatedAudio className={me.player} src={latestRendered.renderedAudioUrl} />
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
  );
}
