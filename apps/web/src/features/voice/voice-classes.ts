/** Tailwind class maps for voice feature UI. */
export const voiceUi = {
  consentCheckbox: [
    "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded",
    "border border-[var(--app-border-strong)] bg-[var(--app-field-bg)]",
    "accent-violet-600",
  ].join(" "),
  consentContent: "flex min-w-0 flex-col gap-1",
  consentTitle: "text-sm font-medium leading-snug text-[var(--app-text)]",
  consentPhrase: "text-sm leading-snug text-[var(--app-text-muted)]",
  recordingTips:
    "rounded-lg border border-violet-500/20 bg-violet-600/5 p-3",
  recordingTipsTitle: "m-0 mb-2 text-sm font-medium text-[var(--app-text)]",
  recordingTipsList:
    "m-0 flex list-disc flex-col gap-1.5 pl-4 text-xs leading-relaxed text-[var(--app-text-muted)]",
  recordingTipsLink:
    "mt-2 inline-block text-xs text-violet-500 underline-offset-2 hover:underline dark:text-violet-400",
} as const;
