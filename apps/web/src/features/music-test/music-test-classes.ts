/** Shared Tailwind classes for Magic Music (dark Suno UI). */
export const mt = {
  page: "flex-1 w-full bg-[#0f0f0f] text-white",
  pageHeader:
    "sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0f0f0f]/80 px-6 py-3 backdrop-blur",
  pageHeaderBrand: "flex items-center gap-2",
  pageHeaderLogo:
    "flex h-7 w-7 items-center justify-center rounded-lg bg-[#18c76a] text-black",
  pageHeaderTitle: "text-sm font-semibold tracking-tight",
  pageHeaderMeta: "text-xs text-neutral-500",
  pageMain: "mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8",
  authLoading: "flex flex-1 items-center justify-center bg-[#0f0f0f] py-24",
  authLoadingInner: "flex items-center gap-3 text-sm text-neutral-400",
  spinner:
    "h-4 w-4 animate-spin rounded-full border-2 border-[#18c76a] border-t-transparent",
  submitSpinner:
    "h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black",
  alertError:
    "rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300",
  alertWarning:
    "rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300",
  inlineCode: "rounded bg-white/10 px-1 font-mono",
  sectionCard:
    "rounded-2xl border border-white/[0.06] bg-[#141414] p-6",
  cardHeader: "mb-5 flex items-center justify-between gap-4",
  cardHeaderTitle: "text-base font-semibold",
  cardHeaderSubtitle: "mt-0.5 text-xs text-neutral-500",
  historyCardHeader: "mb-5 flex items-center gap-2",
  modeToggle:
    "flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-400 transition-all hover:text-white",
  modeToggleActive:
    "flex items-center gap-2 rounded-lg border border-[#18c76a]/40 bg-[#18c76a]/15 px-3 py-1.5 text-xs font-medium text-[#18c76a] transition-all",
  fieldStack: "flex flex-col gap-4",
  fieldLabel:
    "mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400",
  input:
    "w-full rounded-xl border border-white/[0.08] bg-[#1e1e1e] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-neutral-600 focus:border-[#18c76a]/50 focus:ring-1 focus:ring-[#18c76a]/20",
  textarea:
    "w-full resize-none rounded-xl border border-white/[0.08] bg-[#1e1e1e] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-neutral-600 focus:border-[#18c76a]/50 focus:ring-1 focus:ring-[#18c76a]/20",
  textareaLarge:
    "h-44 w-full resize-none rounded-xl border border-white/[0.08] bg-[#1e1e1e] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-neutral-600 focus:border-[#18c76a]/50 focus:ring-1 focus:ring-[#18c76a]/20",
  textareaStyle: "h-16 w-full resize-none",
  textareaPrompt: "h-28 w-full resize-none",
  select:
    "w-full cursor-pointer appearance-none rounded-xl border border-white/[0.08] bg-[#1e1e1e] py-2.5 pl-9 pr-8 text-sm text-white outline-none transition-all focus:border-[#18c76a]/50 focus:ring-1 focus:ring-[#18c76a]/20",
  durationWrap: "relative",
  durationIcon:
    "pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500",
  durationChevron:
    "pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-500",
  meta: "mt-1.5 text-xs text-neutral-500",
  submit:
    "flex w-full items-center justify-center gap-2 rounded-xl bg-[#18c76a] py-3 text-sm font-semibold text-black transition-all hover:bg-[#15b35e] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#18c76a]/30 disabled:text-black/40",
  loaderWrap:
    "mt-4 rounded-xl border border-[#18c76a]/15 bg-[#18c76a]/5 p-4",
  tracksList: "mt-4 flex flex-col gap-3",
  taskMeta: "mt-3 font-mono text-xs text-neutral-600",
  charCounter: "text-xs tabular-nums text-neutral-500",
  charCounterLimit: "text-xs tabular-nums text-rose-400",
  counterPos: "absolute bottom-2 right-3",
  counterPosLarge: "absolute bottom-3 right-3",
  chip: "inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-200 transition-colors",
  chipSelected:
    "inline-flex cursor-pointer items-center rounded-full border border-[#18c76a]/40 bg-[#18c76a]/15 px-2.5 py-1 text-xs text-[#18c76a] transition-colors",
  chipDisabled: "cursor-not-allowed opacity-45",
  chipInput: "sr-only",
  chipRow: "flex flex-wrap gap-1.5",
  styleHint: "text-xs leading-snug text-neutral-500",
  comboPanelItem:
    "w-full cursor-pointer rounded-md border-none bg-transparent px-2.5 py-1.5 text-left text-sm text-neutral-900 hover:bg-[#a8c8ef] focus-visible:bg-[#a8c8ef] focus-visible:outline-none",
  comboPanelItemActive: "w-full cursor-pointer rounded-md bg-[#a8c8ef] px-2.5 py-1.5 text-left text-sm text-neutral-900",
  lyricsBlock: "mt-2 border-t border-white/[0.06] pt-4",
  lyricsPromptLabel:
    "mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-400",
  secondaryButton:
    "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50",
  lyricsVariants: "flex flex-col gap-2",
  lyricsVariantList: "flex flex-wrap gap-2",
  lyricsVariant:
    "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white",
  lyricsVariantActive:
    "rounded-full border border-[#18c76a] bg-[#18c76a]/15 px-3 py-1.5 text-xs text-[#18c76a]",
  errorInline: "text-sm text-rose-400",
  resultPlayer: "rounded-xl border border-white/[0.06] bg-[#1a1a1a] p-4",
  resultHeader: "mb-2 flex items-start justify-between gap-3",
  resultMeta: "flex flex-wrap items-baseline gap-2",
  resultTitle: "text-sm font-semibold text-white",
  resultDuration: "text-xs text-neutral-500",
  editorLink:
    "mt-3 rounded-lg bg-[#18c76a] px-3.5 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60",
  player: "w-full",
  lyrics: "overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-neutral-400",
  lyricsBlockInner: "flex flex-col gap-1.5",
  lyricsHeader: "flex items-center justify-between gap-3",
  lyricsLabel: "text-xs text-neutral-500",
  toggleLyricsButton:
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-neutral-500 hover:text-white",
  toggleLyricsIcon: "h-4 w-4",
  historyList: "flex flex-col gap-3",
  historyToolbar: "grid grid-cols-[auto_1fr_auto] items-center gap-3 pb-1",
  historyToolbarTitle: "text-xs text-neutral-500",
  historyCheckboxLabel: "inline-flex items-center",
  historyCheckbox: "h-4 w-4 cursor-pointer accent-[#18c76a]",
  historyItem:
    "flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-[#1a1a1a] p-3",
  historyHeader: "flex items-start gap-3",
  historyHeaderMain: "flex min-w-0 flex-1 flex-col gap-1.5",
  historyTitleRow: "flex items-start justify-between gap-3",
  historyTitle: "flex-1 text-sm font-semibold text-white",
  historyTitleMeta: "flex flex-wrap items-center gap-2",
  historyBadge:
    "shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-neutral-200",
  historyMeta: "text-xs text-neutral-500",
  historyTrack: "flex flex-col gap-1.5 border-t border-white/[0.06] pt-2",
  historyTrackHeader: "flex items-start justify-between gap-3",
  historyTrackMeta: "flex flex-wrap items-baseline gap-2",
  historyTrackTitle: "text-xs text-neutral-200",
  error: "text-sm text-rose-400",
  icon: "h-4 w-4",
  iconSmall: "h-3 w-3",
} as const;
