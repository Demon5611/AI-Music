"use client";

import type { ReactElement, ReactNode } from "react";
import { useOptionalHintsVisible } from "@/shared/providers/hints-visibility-provider";
import styles from "@/shared/ui/tooltip.module.css";

type TooltipSide = "top" | "bottom" | "left" | "right";
type TooltipAlign = "start" | "center" | "end";

interface TooltipProps {
  content: string;
  side?: TooltipSide;
  align?: TooltipAlign;
  block?: boolean;
  children: ReactElement | ReactNode;
}

function resolvePlacementClass(side: TooltipSide, align: TooltipAlign): string {
  if (align === "center") {
    return styles[side];
  }

  if (side === "top") {
    return align === "start" ? styles.topAlignStart : styles.topAlignEnd;
  }

  if (side === "bottom") {
    return align === "start" ? styles.bottomAlignStart : styles.bottomAlignEnd;
  }

  return styles[side];
}

export function Tooltip({
  content,
  side = "top",
  align = "center",
  block = false,
  children,
}: TooltipProps) {
  const hintsVisible = useOptionalHintsVisible();

  if (hintsVisible === false) {
    return children;
  }

  const placementClass = resolvePlacementClass(side, align);
  const rootClass = block ? `${styles.root} ${styles.rootBlock}` : styles.root;
  const triggerClass = block ? `${styles.trigger} ${styles.triggerBlock}` : styles.trigger;

  const RootTag = block ? "div" : "span";
  const TriggerTag = block ? "div" : "span";

  return (
    <RootTag className={rootClass}>
      <TriggerTag className={triggerClass}>{children}</TriggerTag>
      <span className={`${styles.content} ${placementClass}`} role="tooltip">
        {content}
      </span>
    </RootTag>
  );
}

interface DisabledTooltipButtonProps {
  content: string;
  side?: TooltipSide;
  align?: TooltipAlign;
  children: ReactElement;
}

export function DisabledTooltipWrap({
  content,
  side = "top",
  align = "center",
  children,
}: DisabledTooltipButtonProps) {
  const hintsVisible = useOptionalHintsVisible();

  if (hintsVisible === false) {
    return children;
  }

  return (
    <Tooltip align={align} content={content} side={side}>
      <span className={styles.trigger}>{children}</span>
    </Tooltip>
  );
}
