import { appDark } from "@/shared/theme/app-dark-theme";

/** Shared Tailwind classes for landing page (dark Suno-style UI). */
export const lp = {
  page: `${appDark.page} overflow-x-hidden`,
  heroGlow: appDark.heroGlow,
  heroSection: "relative flex flex-col items-center text-center px-4 pt-16 pb-16 md:pt-20",
  eyebrow: "relative z-10 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400 mb-5",
  title:
    "relative z-10 text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight max-w-3xl mb-6",
  titleGradient:
    "text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-violet-400",
  subtitle: "relative z-10 text-base md:text-lg text-white/45 max-w-lg mb-10 leading-relaxed",
  promptWrap: "relative z-10 w-full max-w-2xl mb-4",
  promptCard: appDark.promptCard,
  promptTextareaWrap: "relative",
  promptTextarea:
    "w-full bg-transparent px-5 pt-4 pb-8 text-sm text-white placeholder-white/25 outline-none resize-none",
  charCounter: appDark.charCounter,
  charCounterLimit: appDark.charCounterLimit,
  promptCounterPos: "pointer-events-none absolute bottom-2 right-5",
  promptActions: "flex items-center justify-between px-4 pb-3",
  iconButton: appDark.iconButton,
  createButton: appDark.btnPrimarySm,
  note: "relative z-10 text-xs text-white/25",
  statsGrid:
    "relative z-10 mx-4 md:mx-auto md:max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden mb-20",
  statCell: `${appDark.bgElevated} px-6 py-4 flex flex-col gap-0.5`,
  statLabel: "text-xs text-white/35 uppercase tracking-wider",
  statValue: "text-xl font-bold tabular-nums",
  statUnit: "text-white/40 text-sm font-normal",
  playlistsSection: "px-4 md:px-8 max-w-6xl mx-auto pb-24",
  playlistsGrid: "grid md:grid-cols-3 gap-4",
  playlistCard: `rounded-2xl ${appDark.borderSubtle} border overflow-hidden bg-gradient-to-b`,
  playlistHeader: "p-5 pb-3 flex items-center gap-4",
  playlistPlayBtn:
    "w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform",
  playlistTitle: "font-semibold text-base",
  trackList: "px-2 pb-2",
  trackRow: `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${appDark.hoverRow} text-left group`,
  trackThumb: "w-10 h-10 rounded-lg flex-shrink-0 opacity-70 bg-gradient-to-br",
  trackTitle: "text-sm font-medium truncate group-hover:text-white transition-colors",
  trackMeta: "text-xs text-white/35 truncate",
  seeMoreWrap: "px-4 py-3 border-t border-white/[0.05]",
  seeMoreLink:
    "flex items-center justify-center gap-1.5 w-full py-2 text-sm text-white/50 hover:text-white transition-colors rounded-xl hover:bg-white/5",
  ctaSection: "text-center px-4 pb-24",
  ctaTitle: "text-3xl md:text-4xl font-bold mb-4",
  ctaSubtitle: "text-white/40 text-sm mb-8 max-w-xs mx-auto",
  ctaActions: "flex items-center justify-center gap-3 flex-wrap",
  ctaPrimary: appDark.btnPrimaryPill,
  ctaSecondary: appDark.btnSecondaryOutline,
  footer:
    "border-t border-white/[0.05] px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/20",
  footerLinks: "flex gap-6",
  footerLink: "hover:text-white/50 transition-colors",
} as const;
