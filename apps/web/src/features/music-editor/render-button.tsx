"use client";

import type { SongVersionDto } from "@ai-music/shared";
import { AuthenticatedAudio } from "@/shared/ui/authenticated-audio";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface RenderButtonProps {
  disabled: boolean;
  isRendering: boolean;
  versions: SongVersionDto[];
  onRender: () => void;
}

export function RenderButton({
  disabled,
  isRendering,
  versions,
  onRender,
}: RenderButtonProps) {
  const latestRendered = versions.find(
    (version) => version.status === "completed" && version.renderedAudioUrl,
  );

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Render version</h3>
      <button
        className={styles.primaryButton}
        disabled={disabled || isRendering}
        type="button"
        onClick={onRender}
      >
        {isRendering ? "Rendering..." : "Render version"}
      </button>
      {latestRendered?.renderedAudioUrl ? (
        <div className={styles.renderResult}>
          <p className={styles.panelHint}>
            Version v{latestRendered.versionNumber} готова
          </p>
          <AuthenticatedAudio
            className={styles.player}
            src={latestRendered.renderedAudioUrl}
          />
        </div>
      ) : null}
    </div>
  );
}
