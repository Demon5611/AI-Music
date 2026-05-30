"use client";

import { useState } from "react";
import { Tooltip } from "@/shared/ui/tooltip";
import styles from "@/features/music-editor/styles/music-editor.module.css";

export function EditorHelpPanel() {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip content="Краткая инструкция по всему flow редактирования" block>
      <div className={styles.helpPanel}>
        <button
          className={styles.helpToggle}
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          ? Как пользоваться редактором
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
    </Tooltip>
  );
}
