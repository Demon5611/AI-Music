"use client";

import { useHintsVisibility } from "@/shared/providers/hints-visibility-provider";
import { useState } from "react";
import styles from "@/features/music-editor/styles/music-editor.module.css";

export function EditorHelpPanel() {
  const { hintsVisible } = useHintsVisibility();
  const [open, setOpen] = useState(false);

  if (!hintsVisible) {
    return null;
  }

  return (
    <div className={styles.helpPanel}>
      <button
        className={styles.helpToggle}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        Как пользоваться редактором ?
      </button>
      {open ? (
        <ol className={styles.helpList}>
          <li>Кликните timeline, чтобы выбрать регион под playhead</li>
          <li>Split и другие Region actions применяются к выбранному региону</li>
          <li>Выберите дорожку Vocal или Instrumental</li>
          <li>Примените действие: volume, fade, split, duplicate</li>
          <li>Нажмите Render version</li>
        </ol>
      ) : null}
    </div>
  );
}
