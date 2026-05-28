"use client";

import styles from "@/features/music-editor/styles/music-editor.module.css";

interface RegionToolbarProps {
  disabled: boolean;
  onSplit: () => void;
  onDuplicate: () => void;
  onFadeIn: () => void;
  onFadeOut: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onReplaceVocal: () => void;
  onExtend: () => void;
  onRegenerate: () => void;
}

export function RegionToolbar({
  disabled,
  onSplit,
  onDuplicate,
  onFadeIn,
  onFadeOut,
  onMoveLeft,
  onMoveRight,
  onReplaceVocal,
  onExtend,
  onRegenerate,
}: RegionToolbarProps) {
  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Region actions</h3>
      <div className={styles.toolbarGrid}>
        <button className={styles.toolButton} disabled={disabled} type="button" onClick={onSplit}>
          Split
        </button>
        <button
          className={styles.toolButton}
          disabled={disabled}
          type="button"
          onClick={onDuplicate}
        >
          Duplicate
        </button>
        <button className={styles.toolButton} disabled={disabled} type="button" onClick={onFadeIn}>
          Fade in
        </button>
        <button className={styles.toolButton} disabled={disabled} type="button" onClick={onFadeOut}>
          Fade out
        </button>
        <button
          className={styles.toolButton}
          disabled={disabled}
          type="button"
          onClick={onMoveLeft}
        >
          Поменять части (влево)
        </button>
        <button
          className={styles.toolButton}
          disabled={disabled}
          type="button"
          onClick={onMoveRight}
        >
          Поменять части (вправо)
        </button>
        <button
          className={styles.toolButton}
          disabled={disabled}
          type="button"
          onClick={onReplaceVocal}
        >
          Заменить вокал
        </button>
        <button className={styles.toolButton} disabled={disabled} type="button" onClick={onExtend}>
          Продлить после этого места
        </button>
        <button
          className={styles.toolButton}
          disabled={disabled}
          type="button"
          onClick={onRegenerate}
        >
          Перегенерировать фрагмент
        </button>
      </div>
    </div>
  );
}
