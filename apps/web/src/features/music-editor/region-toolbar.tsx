"use client";

import { VoiceUploadPanel } from "@/features/voice/voice-upload-panel";
import { Tooltip, DisabledTooltipWrap } from "@/shared/ui/tooltip";
import { me } from "@/features/music-editor/music-editor-classes";

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
      ? me.toolButtonDestructive
      : variant === "ai"
        ? me.toolButtonAi
        : me.toolButton;

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
}: RegionToolbarProps) {
  const actionsDisabled = disabled || !regionSelected;

  return (
    <div className={me.panel}>
      <h3 className={me.panelTitle}>Basic edit (изменения в рамках выделенного блока)</h3>

      {!regionSelected ? (
        <p className={me.panelHint}>Сначала выберите фрагмент на timeline</p>
      ) : null}

      <div className={me.toolbarSection}>
        <div className={me.toolbarGrid}>
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

      <div className={me.toolbarSection}>
        <p className={me.toolbarSectionTitle}>AI actions</p>
        <div className={me.toolbarGrid}>
          <RegionActionButton
            disabled={actionsDisabled}
            label="Replace vocal"
            tooltip="Заменить дорожку Vocal через Kits voice transfer"
            variant="ai"
            onClick={onReplaceVocal}
          />
        </div>
      </div>
      <div className={me.toolbarSection}>
        <p className={me.toolbarSectionTitle}>Заменить дорожку Vocal своим вокалом</p>
        <VoiceUploadPanel
          disabled={actionsDisabled}
          variant="embedded"
          onSuccess={onOwnVoiceUploaded}
        />
      </div>
    </div>
  );
}
