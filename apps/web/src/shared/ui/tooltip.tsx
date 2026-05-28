"use client";

import type { ReactElement, ReactNode } from "react";
import styles from "@/shared/ui/tooltip.module.css";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  side?: TooltipSide;
  block?: boolean;
  children: ReactElement | ReactNode;
}

export function Tooltip({
  content,
  side = "top",
  block = false,
  children,
}: TooltipProps) {
  const sideClass =
    side === "bottom"
      ? styles.bottom
      : side === "left"
        ? styles.left
        : side === "right"
          ? styles.right
          : styles.top;

  return (
    <span
      className={block ? `${styles.root} ${styles.rootBlock}` : styles.root}
    >
      <span
        className={
          block ? `${styles.trigger} ${styles.triggerBlock}` : styles.trigger
        }
      >
        {children}
      </span>
      <span className={`${styles.content} ${sideClass}`} role="tooltip">
        {content}
      </span>
    </span>
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
  return (
    <Tooltip content={content} side={side}>
      <span className={styles.trigger}>{children}</span>
    </Tooltip>
  );
}
