"use client";

import { useHintsVisibility } from "@/shared/providers/hints-visibility-provider";
import { useState } from "react";
import { me } from "@/features/music-editor/music-editor-classes";

export function EditorHelpPanel() {
  const { hintsVisible } = useHintsVisibility();
  const [open, setOpen] = useState(false);

  if (!hintsVisible) {
    return null;
  }

  return (
    <div className={me.helpPanel}>
      <button
        className={me.helpToggle}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        Как пользоваться редактором ?
      </button>
      {open ? (
        <ol className={me.helpList}>
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
