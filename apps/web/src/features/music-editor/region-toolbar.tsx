"use client";

import { VoiceUploadPanel } from "@/features/voice/voice-upload-panel";
import { Tooltip, DisabledTooltipWrap } from "@/shared/ui/tooltip";
import styles from "@/features/music-editor/styles/music-editor.module.css";

interface RegionToolbarProps {
  disabled: boolean;
  regionSelected: boolean;
  onSplit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFadeIn: () => void;
  onFadeOut: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onReplaceVocal: () => void;
  onOwnVoiceUploaded: (sampleId: string) => void;
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
    return <DisabledTooltipWrap content={tooltip}>{button}</DisabledTooltipWrap>;
  }

  return <Tooltip content={tooltip}>{button}</Tooltip>;
}

export function RegionToolbar({
  disabled,
  regionSelected,
  onSplit,
  onDelete,
  onDuplicate,
  onFadeIn,
  onFadeOut,
  onMoveLeft,
  onMoveRight,
  onReplaceVocal,
  onOwnVoiceUploaded,
  onExtend,
  onRegenerate,
}: RegionToolbarProps) {
  const actionsDisabled = disabled || !regionSelected;

  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>Basic edit</h3>

      {!regionSelected ? (
        <p className={styles.panelHint}>Сначала выберите фрагмент на timeline</p>
      ) : null}

      <div className={styles.toolbarSection}>
        <div className={styles.toolbarGrid}>
          <RegionActionButton
            disabled={actionsDisabled}
            label="Split"
            tooltip="Разделить выбранный фрагмент в позиции playhead на timeline"
            onClick={onSplit}
          />
          <RegionActionButton
            disabled={actionsDisabled}
            label="Delete"
            tooltip="Удалить выделенный фрагмент на timeline или весь region, если выделения нет"
            variant="destructive"
            onClick={onDelete}
          />
          <RegionActionButton
            disabled={actionsDisabled}
            label="Duplicate"
            tooltip="Создать копию выбранного фрагмента"
            onClick={onDuplicate}
          />
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
            tooltip="Заменить дорожку Vocal через Kits voice transfer"
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
      <div className={styles.toolbarSection}>
        <p className={styles.toolbarSectionTitle}>Заменить дорожку Vocal своим вокалом</p>
        <VoiceUploadPanel
          disabled={actionsDisabled}
          variant="embedded"
          onSuccess={onOwnVoiceUploaded}
        />
      </div>
    </div>
  );
}
