import { appShell } from "@/shared/theme/app-theme";
import { mtk } from "@/shared/theme/music-track-classes";

export const karaokeUi = {
  section: "mt-3 flex flex-col gap-2",
  header: mtk.lyricsHeader,
  label: mtk.lyricsLabel,
  toggleButton: `${appShell.btnSecondaryOutline} px-3 py-1.5 text-xs`,
  toggleButtonActive: "border-violet-500/60 bg-violet-500/10 text-violet-200",
  toggleButtonDisabled: "cursor-not-allowed opacity-60",
  lines: "flex flex-col gap-1.5",
  line: `rounded-md px-2 py-1 text-xs leading-relaxed transition-colors ${appShell.textMuted}`,
  lineActive: "bg-violet-500/15 text-[var(--app-text)]",
  wordLine: `rounded-md px-2 py-1 text-xs leading-relaxed transition-colors ${appShell.textMuted}`,
  wordLineActive: "bg-violet-500/10",
  word: "mr-1 inline transition-colors",
  wordPast: "text-[var(--app-text)]/55",
  wordActive: "font-medium text-violet-200",
  wordUpcoming: appShell.textMuted,
  status: `text-xs ${appShell.textMuted}`,
  error: mtk.error,
  upgradeLink: "text-violet-300 underline underline-offset-2 hover:text-violet-200",
} as const;
