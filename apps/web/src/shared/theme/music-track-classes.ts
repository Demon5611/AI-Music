import { appShell } from "@/shared/theme/app-theme";

/** Shared Tailwind classes for music track cards, lyrics, and history lists. */
export const mtk = {
  lyrics: `overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed ${appShell.textMuted}`,
  lyricsBlockInner: "flex flex-col gap-1.5",
  lyricsHeader: "flex items-center justify-between gap-3",
  lyricsLabel: `text-xs ${appShell.textMuted}`,
  toggleLyricsButton:
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--app-border-default)] bg-[var(--app-hover-overlay)] text-[var(--app-text-muted)] hover:text-[var(--app-text)]",
  toggleLyricsIcon: "h-4 w-4",
  resultPlayer: `${appShell.surfaceCard} p-4`,
  resultHeader: "mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3",
  resultActions: "flex shrink-0 flex-wrap items-center gap-1.5",
  resultDownloadButton: `${appShell.btnSecondaryOutline} px-3 py-1.5 text-xs`,
  resultMeta: "flex flex-wrap items-baseline gap-2",
  resultTitle: "text-sm font-semibold text-[var(--app-text)]",
  resultDuration: `text-xs ${appShell.textMuted}`,
  editorLink:
    "mt-3 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60",
  player: "w-full min-w-0",
  meta: `mt-1.5 text-xs ${appShell.textMuted}`,
  error: "text-sm text-rose-400",
  historyList: "flex flex-col gap-3",
  historyToolbar:
    "flex flex-col gap-2 pb-1 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-3",
  historyToolbarTitle: `text-xs ${appShell.textMuted}`,
  historyCheckboxLabel: "inline-flex items-center",
  historyCheckbox: appShell.accentCheckbox,
  historyItem: `flex flex-col gap-2 ${appShell.surfaceCard} p-3`,
  historyHeader: "flex items-start gap-3",
  historyHeaderMain: "flex min-w-0 flex-1 flex-col gap-1.5",
  historyTitleRow: "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3",
  historyTitle: "flex-1 text-sm font-semibold text-[var(--app-text)]",
  historyTitleMeta: "flex flex-wrap items-center gap-2",
  historyBadge:
    "shrink-0 rounded-full bg-[var(--app-hover-overlay)] px-2 py-0.5 text-xs text-[var(--app-text)]",
  historyMeta: `text-xs ${appShell.textMuted}`,
  historyTrack: "flex min-w-0 flex-col gap-1.5 border-t border-[var(--app-border-subtle)] pt-2",
  historyTrackHeader: "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3",
  historyTrackMeta: "flex flex-wrap items-baseline gap-2",
  historyTrackTitle: "text-xs text-[var(--app-text)]",
} as const;
