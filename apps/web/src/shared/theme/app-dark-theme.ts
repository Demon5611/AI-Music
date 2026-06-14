/**
 * Dark UI theme tokens (landing reference).
 * Tailwind classes use literal hex — keep in sync with APP_DARK_COLORS.
 */
export const APP_DARK_COLORS = {
  bgPage: "#0a0a0a",
  bgElevated: "#111111",
  bgSurface: "#1c1c1c",
  accentPrimary: "#7c3aed",
  accentPrimaryHover: "#8b5cf6",
  accentPrimaryActive: "#6d28d9",
  accentSoft: "#a78bfa",
  glowVioletInner: "#5b21b6",
  glowVioletOuter: "#4c1d95",
  textPrimary: "#ffffff",
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  borderDefault: "rgba(255, 255, 255, 0.10)",
  borderStrong: "rgba(255, 255, 255, 0.15)",
} as const;

/** Routes that use the dark app shell (page bg + header). */
export const APP_DARK_SHELL_ROUTES = ["/", "/music-create", "/history"] as const;

export function isAppDarkShellRoute(pathname: string): boolean {
  return APP_DARK_SHELL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

const fieldFocus =
  "focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20";

const fieldBase = [
  "rounded-xl border border-white/[0.08] bg-[#1c1c1c]",
  "text-sm text-white outline-none transition-all",
  "placeholder:text-neutral-600",
  fieldFocus,
].join(" ");

/** Shared Tailwind class fragments for dark app pages. */
export const appDark = {
  bgPage: "bg-[#0a0a0a]",
  bgPage80: "bg-[#0a0a0a]/80",
  bgElevated: "bg-[#111111]",
  bgSurface: "bg-[#1c1c1c]",
  textWhite: "text-white",
  borderSubtle: "border-white/[0.06]",
  borderDefault: "border-white/10",
  page: "flex-1 w-full bg-[#0a0a0a] text-white",
  pageHeader:
    "sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0a0a]/80 px-6 py-3 backdrop-blur",
  pageHeaderLogo:
    "flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white",
  sectionCard: "rounded-2xl border border-white/[0.06] bg-[#1c1c1c] p-6",
  surfaceCard: "rounded-xl border border-white/[0.06] bg-[#1c1c1c]",
  promptCard:
    "flex flex-col bg-[#1c1c1c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 focus-within:border-violet-500/50 transition-colors",
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
    "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50",
  btnSecondaryOutline:
    "px-6 py-3 rounded-full text-sm font-medium border border-white/10 hover:border-white/25 text-white/60 hover:text-white transition-all",
  chip:
    "inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-neutral-200 transition-colors",
  chipSelected:
    "inline-flex cursor-pointer items-center rounded-full border border-violet-500/40 bg-violet-600/15 px-2.5 py-1 text-xs text-violet-400 transition-colors",
  chipDisabled: "cursor-not-allowed opacity-45",
  modeToggle:
    "flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-400 transition-all hover:text-white",
  modeToggleActive:
    "flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-medium text-violet-400 transition-all",
  spinner: "h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent",
  loaderWrap: "mt-4 rounded-xl border border-violet-500/15 bg-violet-600/5 p-4",
  charCounter: "text-xs tabular-nums text-neutral-500",
  charCounterLimit: "text-xs tabular-nums text-rose-400",
  accentCheckbox: "h-4 w-4 cursor-pointer accent-violet-600",
  heroGlow:
    "pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[700px] h-[500px] rounded-full opacity-30 blur-[120px] bg-[radial-gradient(ellipse_at_center,#5b21b6_0%,#4c1d95_40%,transparent_70%)]",
  iconButton:
    "p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all",
  hoverRow: "hover:bg-white/5 transition-colors",
} as const;
