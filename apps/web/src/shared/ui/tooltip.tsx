"use client";

import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useOptionalHintsVisible } from "@/shared/providers/hints-visibility-provider";
import { tt, type TooltipAlign, type TooltipSide } from "@/shared/ui/tooltip-classes";

interface TooltipProps {
  content: string;
  side?: TooltipSide;
  align?: TooltipAlign;
  block?: boolean;
  children: ReactElement | ReactNode;
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

  const rootClass = block ? tt.rootBlock : tt.root;
  const triggerClass = block ? tt.triggerBlock : tt.trigger;
  const contentClass = tt.placement(side, align);

  const RootTag = block ? "div" : "span";
  const TriggerTag = block ? "div" : "span";

  return (
    <RootTag className={rootClass}>
      <TriggerTag className={triggerClass}>{children}</TriggerTag>
      <span className={contentClass} role="tooltip">
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
      <span className={tt.trigger}>{children}</span>
    </Tooltip>
  );
}
