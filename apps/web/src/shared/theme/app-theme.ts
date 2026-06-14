/**
 * App shell Tailwind classes driven by CSS variables in globals.css.
 * Toggle light/dark via next-themes (class on <html>).
 */
const fieldFocus =
  "focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20";

const fieldBase = [
  "rounded-xl border border-[var(--app-field-border)] bg-[var(--app-field-bg)]",
  "text-sm text-[var(--app-text)] outline-none transition-all",
  "placeholder:text-[var(--app-text-subtle)]",
  fieldFocus,
].join(" ");

export const appShell = {
  bgPage: "bg-[var(--app-bg-page)]",
  bgPage80: "bg-[var(--app-bg-page)]/80",
  bgElevated: "bg-[var(--app-bg-elevated)]",
  bgSurface: "bg-[var(--app-bg-surface)]",
  textPrimary: "text-[var(--app-text)]",
  textMuted: "text-[var(--app-text-muted)]",
  textSubtle: "text-[var(--app-text-subtle)]",
  borderSubtle: "border-[var(--app-border-subtle)]",
  borderDefault: "border-[var(--app-border-default)]",
  page: "flex-1 w-full bg-[var(--app-bg-page)] text-[var(--app-text)]",
  pageHeader:
    "sticky top-0 z-10 flex items-center justify-between border-b border-[var(--app-border-subtle)] bg-[var(--app-bg-page)]/80 px-6 py-3 backdrop-blur",
  pageHeaderLogo:
    "flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white",
  sectionCard:
    "rounded-2xl border border-[var(--app-border-subtle)] bg-[var(--app-bg-surface)] p-6",
  surfaceCard:
    "rounded-xl border border-[var(--app-border-subtle)] bg-[var(--app-bg-surface)]",
  promptCard: [
    "flex flex-col bg-[var(--app-bg-surface)] border border-[var(--app-border-default)]",
    "rounded-2xl overflow-hidden shadow-2xl shadow-[var(--app-shadow)]",
    "focus-within:border-violet-500/50 transition-colors",
  ].join(" "),
  fieldInput: `w-full px-4 py-2.5 ${fieldBase}`,
  fieldTextarea: `w-full resize-none px-4 py-2.5 ${fieldBase}`,
  fieldTextareaLarge: `h-44 w-full resize-none px-4 py-3 ${fieldBase}`,
  fieldSelect: `w-full cursor-pointer appearance-none py-2.5 pl-9 pr-8 ${fieldBase}`,
  btnPrimary:
    "flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition-all hover:bg-violet-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-violet-600/30 disabled:text-white/40",
  btnPrimarySm:
    "flex items-center gap-2 bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all px-5 py-2 rounded-xl text-sm font-semibold text-white",
  btnPrimaryPill:
    "flex items-center gap-2 bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all px-6 py-3 rounded-full text-sm font-semibold text-white",
  btnSecondary:
    "rounded-full border border-[var(--app-border-default)] bg-[var(--app-hover-overlay)] px-4 py-2 text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-hover-overlay-strong)] disabled:cursor-not-allowed disabled:opacity-50",
  btnSecondaryOutline:
    "px-6 py-3 rounded-full text-sm font-medium border border-[var(--app-border-default)] hover:border-[var(--app-border-strong)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-all",
  chip:
    "inline-flex cursor-pointer items-center rounded-full border border-[var(--app-border-default)] bg-[var(--app-hover-overlay)] px-2.5 py-1 text-xs text-[var(--app-text)] transition-colors",
  chipSelected:
    "inline-flex cursor-pointer items-center rounded-full border border-violet-500/40 bg-violet-600/15 px-2.5 py-1 text-xs text-violet-500 dark:text-violet-400 transition-colors",
  chipDisabled: "cursor-not-allowed opacity-45",
  modeToggle:
    "flex items-center gap-2 rounded-lg border border-[var(--app-border-default)] bg-[var(--app-hover-overlay)] px-3 py-1.5 text-xs font-medium text-[var(--app-text-muted)] transition-all hover:text-[var(--app-text)]",
  modeToggleActive:
    "flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-medium text-violet-500 dark:text-violet-400 transition-all",
  spinner: "h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent",
  loaderWrap: "mt-4 rounded-xl border border-violet-500/15 bg-violet-600/5 p-4",
  charCounter: "text-xs tabular-nums text-neutral-500",
  charCounterLimit: "text-xs tabular-nums text-rose-400",
  accentCheckbox: "h-4 w-4 cursor-pointer accent-violet-600",
  heroGlow:
    "pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[700px] h-[500px] rounded-full opacity-30 blur-[120px] bg-[var(--app-hero-glow)]",
  iconButton:
    "p-2 rounded-lg text-[var(--app-text-subtle)] hover:text-[var(--app-text)] hover:bg-[var(--app-hover-overlay)] transition-all",
  hoverRow: "hover:bg-[var(--app-hover-overlay)] transition-colors",
} as const;
