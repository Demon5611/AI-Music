"use client";

import { useHintsVisibility } from "@/shared/providers/hints-visibility-provider";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface EditorHeaderProps {
  title: string;
}

export function EditorHeader({ title }: EditorHeaderProps) {
  const { hintsVisible, setHintsVisible } = useHintsVisibility();

  return (
    <div className={styles.editorHeader}>
      <h1 className={styles.title}>{title || "Audio Editor"}</h1>
      <label className={styles.hintsToggle}>
        <span className={styles.hintsToggleLabel}>Подсказки</span>
        <input
          checked={hintsVisible}
          className={styles.hintsToggleInput}
          type="checkbox"
          onChange={(event) => setHintsVisible(event.target.checked)}
        />
        <span className={styles.hintsToggleTrack} aria-hidden="true">
          <span className={styles.hintsToggleThumb} />
        </span>
      </label>
    </div>
  );
}
