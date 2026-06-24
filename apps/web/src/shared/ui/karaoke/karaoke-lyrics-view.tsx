"use client";

import Link from "next/link";
import type { TimedLyricsLine } from "@ai-music/shared";
import { karaokeUi } from "@/shared/ui/karaoke/karaoke-classes";
import { cn } from "@/lib/utils";

interface KaraokeLyricsViewProps {
  lines: TimedLyricsLine[];
  currentTimeSec: number;
}

export function KaraokeLyricsView({ lines, currentTimeSec }: KaraokeLyricsViewProps) {
  return (
    <div className={karaokeUi.lines}>
      {lines.map((line, index) => {
        const isActive =
          currentTimeSec >= line.startSec &&
          (index === lines.length - 1
            ? currentTimeSec <= line.endSec + 0.25
            : currentTimeSec < line.endSec);

        return (
          <p
            key={`${line.startSec}-${line.endSec}-${line.text}`}
            className={cn(karaokeUi.line, isActive ? karaokeUi.lineActive : undefined)}
          >
            {line.text}
          </p>
        );
      })}
    </div>
  );
}

interface KaraokeToggleProps {
  enabled: boolean;
  canUseKaraoke: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function KaraokeToggle({
  enabled,
  canUseKaraoke,
  disabled,
  onToggle,
}: KaraokeToggleProps) {
  const isDisabled = disabled || !canUseKaraoke;
  const label = enabled ? "Караоке: вкл" : "Караоке: выкл";
  const className = cn(
    karaokeUi.toggleButton,
    enabled && canUseKaraoke ? karaokeUi.toggleButtonActive : undefined,
    isDisabled ? karaokeUi.toggleButtonDisabled : undefined,
  );
  const title = canUseKaraoke ? undefined : "Karaoke Sync доступен на тарифе Pro";

  if (enabled) {
    return (
      <button
        aria-pressed="true"
        className={className}
        disabled={isDisabled}
        title={title}
        type="button"
        onClick={onToggle}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      aria-pressed="false"
      className={className}
      disabled={isDisabled}
      title={title}
      type="button"
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

export function KaraokeUpgradeHint() {
  return (
    <p className={karaokeUi.status}>
      Karaoke Sync — на тарифе Pro.{" "}
      <Link className={karaokeUi.upgradeLink} href="/pricing">
        Тарифы
      </Link>
    </p>
  );
}
