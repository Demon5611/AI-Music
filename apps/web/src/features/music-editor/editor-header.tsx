"use client";

import { useHintsVisibility } from "@/shared/providers/hints-visibility-provider";
import { me } from "@/features/music-editor/music-editor-classes";

interface EditorHeaderProps {
  title: string;
}

export function EditorHeader({ title }: EditorHeaderProps) {
  const { hintsVisible, setHintsVisible } = useHintsVisibility();

  return (
    <div className={me.editorHeader}>
      <h1 className={me.title}>{title || "Audio Editor"}</h1>
      <label className={me.hintsToggle}>
        <span className={me.hintsToggleLabel}>Подсказки</span>
        <input
          checked={hintsVisible}
          className={me.hintsToggleInput}
          type="checkbox"
          onChange={(event) => setHintsVisible(event.target.checked)}
        />
        <span className={me.hintsToggleTrack} aria-hidden="true">
          <span className={me.hintsToggleThumb} />
        </span>
      </label>
    </div>
  );
}
