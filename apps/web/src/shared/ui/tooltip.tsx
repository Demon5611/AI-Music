"use client";

import type { ReactElement, ReactNode } from "react";
import { useOptionalHintsVisible } from "@/shared/providers/hints-visibility-provider";
import styles from "@/shared/ui/tooltip.module.css";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  side?: TooltipSide;
  block?: boolean;
  children: ReactElement | ReactNode;
}

export function Tooltip({ content, side = "top", block = false, children }: TooltipProps) {
  const hintsVisible = useOptionalHintsVisible();

  if (hintsVisible === false) {
    return children;
  }

  const sideClass =
    side === "bottom"
      ? styles.bottom
      : side === "left"
        ? styles.left
        : side === "right"
          ? styles.right
          : styles.top;

  const rootClass = block ? `${styles.root} ${styles.rootBlock}` : styles.root;
  const triggerClass = block ? `${styles.trigger} ${styles.triggerBlock}` : styles.trigger;

  const RootTag = block ? "div" : "span";
  const TriggerTag = block ? "div" : "span";

  return (
    <RootTag className={rootClass}>
      <TriggerTag className={triggerClass}>{children}</TriggerTag>
      <span className={`${styles.content} ${sideClass}`} role="tooltip">
        {content}
      </span>
    </RootTag>
  );
}

interface DisabledTooltipButtonProps {
  content: string;
  side?: TooltipSide;
  children: ReactElement;
}

export function DisabledTooltipWrap({
  content,
  side = "top",
  children,
}: DisabledTooltipButtonProps) {
  const hintsVisible = useOptionalHintsVisible();

  if (hintsVisible === false) {
    return children;
  }

  return (
    <Tooltip content={content} side={side}>
      <span className={styles.trigger}>{children}</span>
    </Tooltip>
  );
}
