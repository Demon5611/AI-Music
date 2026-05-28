"use client";

import { Tooltip, DisabledTooltipWrap } from "@/shared/ui/tooltip";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface RegionToolbarProps {
  disabled: boolean;
  regionSelected: boolean;
  onSplit: () => void;
  onCut: () => void;
  onDuplicate: () => void;
  onFadeIn: () => void;
  onFadeOut: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onReplaceVocal: () => void;
  onExtend: () => void;
  onRegenerate: () => void;
}

function RegionActionButton({
  label,
  tooltip,
  disabled,
  onClick,
  variant = "default",
}: {
  label: string;
  tooltip: string;
  disabled: boolean;
  onClick: () => void;
  variant?: "default" | "destructive" | "ai";
}) {
  const className =
    variant === "destructive"
      ? styles.toolButtonDestructive
      : variant === "ai"
        ? styles.toolButtonAi
        : styles.toolButton;

  const button = (
    <button className={className} disabled={disabled} type="button" onClick={onClick}>
      {label}
    </button>
  );

  if (disabled) {
    return (
      <DisabledTooltipWrap content={tooltip}>
        {button}
      </DisabledTooltipWrap>
    );
  }

  return <Tooltip content={tooltip}>{button}</Tooltip>;
}

export function RegionToolbar({
  disabled,
  regionSelected,
  onSplit,
  onCut,
  onDuplicate,
  onFadeIn,
  onFadeOut,
  onMoveLeft,
  onMoveRight,
  onReplaceVocal,
  onExtend,
  onRegenerate,
}: RegionToolbarProps) {
  const actionsDisabled = disabled || !regionSelected;

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Region actions</h3>

      {!regionSelected ? (
        <p className={styles.panelHint}>
          Сначала выберите фрагмент на timeline
        </p>
      ) : null}

      <div className={styles.toolbarSection}>
        <p className={styles.toolbarSectionTitle}>Basic edit</p>
        <div className={styles.toolbarGrid}>
          <RegionActionButton
            disabled={actionsDisabled}
            label="Split"
            tooltip="Разделить выбранный фрагмент на две части"
            onClick={onSplit}
          />
          <RegionActionButton
            disabled={actionsDisabled}
            label="Cut"
            tooltip="Удалить выбранный фрагмент из версии"
            variant="destructive"
            onClick={onCut}
          />
          <RegionActionButton
            disabled={actionsDisabled}
            label="Duplicate"
            tooltip="Создать копию выбранного фрагмента"
            onClick={onDuplicate}
          />
        </div>
      </div>

      <div className={styles.toolbarSection}>
        <p className={styles.toolbarSectionTitle}>Fade</p>
        <div className={styles.toolbarGrid}>
          <RegionActionButton
            disabled={actionsDisabled}
            label="Fade in"
            tooltip="Плавно увеличить громкость в начале фрагмента"
            onClick={onFadeIn}
          />
          <RegionActionButton
            disabled={actionsDisabled}
            label="Fade out"
            tooltip="Плавно уменьшить громкость в конце фрагмента"
            onClick={onFadeOut}
          />
        </div>
      </div>

      <div className={styles.toolbarSection}>
        <p className={styles.toolbarSectionTitle}>Arrangement</p>
        <div className={styles.toolbarGrid}>
          <RegionActionButton
            disabled={actionsDisabled}
            label="Move left"
            tooltip="Переместить выбранный фрагмент левее"
            onClick={onMoveLeft}
          />
          <RegionActionButton
            disabled={actionsDisabled}
            label="Move right"
            tooltip="Переместить выбранный фрагмент правее"
            onClick={onMoveRight}
          />
        </div>
      </div>

      <div className={styles.toolbarSection}>
        <p className={styles.toolbarSectionTitle}>AI actions</p>
        <div className={styles.toolbarGrid}>
          <RegionActionButton
            disabled={actionsDisabled}
            label="Replace vocal"
            tooltip="Заменить голос в выбранном фрагменте через Kits voice transfer"
            variant="ai"
            onClick={onReplaceVocal}
          />
          <RegionActionButton
            disabled={actionsDisabled}
            label="Extend after this"
            tooltip="Продлить трек после выбранного места через AI provider"
            variant="ai"
            onClick={onExtend}
          />
          <RegionActionButton
            disabled={actionsDisabled}
            label="Regenerate region"
            tooltip="Перегенерировать только выбранный фрагмент, не весь трек"
            variant="ai"
            onClick={onRegenerate}
          />
        </div>
      </div>
    </div>
  );
}
