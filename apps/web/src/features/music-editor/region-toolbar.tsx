"use client";

import { Tooltip, DisabledTooltipWrap } from "@/shared/ui/tooltip";
import { me } from "@/features/music-editor/music-editor-classes";

interface RegionToolbarProps {
  disabled: boolean;
  regionSelected: boolean;
  lockedAdvancedOps?: boolean;
  onSplit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFadeIn: () => void;
  onFadeOut: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
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
  variant?: "default" | "destructive";
}) {
  const className =
    variant === "destructive" ? me.toolButtonDestructive : me.toolButton;

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
  lockedAdvancedOps = false,
  onSplit,
  onDelete,
  onDuplicate,
  onFadeIn,
  onFadeOut,
  onMoveLeft,
  onMoveRight,
}: RegionToolbarProps) {
  const actionsDisabled = disabled || !regionSelected;
  const advancedLockedTooltip = "Доступно на тарифе Pro и выше";

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
            disabled={actionsDisabled || lockedAdvancedOps}
            label="Delete"
            tooltip={
              lockedAdvancedOps
                ? advancedLockedTooltip
                : "Удалить выделенный фрагмент на timeline или весь region, если выделения нет"
            }
            variant="destructive"
            onClick={onDelete}
          />
          <RegionActionButton
            disabled={actionsDisabled || lockedAdvancedOps}
            label="Duplicate"
            tooltip={
              lockedAdvancedOps ? advancedLockedTooltip : "Создать копию выбранного фрагмента"
            }
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
    </div>
  );
}
