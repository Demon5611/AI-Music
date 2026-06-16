import { appShell } from "@/shared/theme/app-theme";

/** Shared Tailwind classes for landing page. */
export const lp = {
  page: `${appShell.page} overflow-x-hidden`,
  heroGlow: appShell.heroGlow,
  heroSection: "relative flex flex-col items-center text-center px-4 pt-16 pb-16 md:pt-20",
  eyebrow: "relative z-10 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400 mb-5",
  title:
    "relative z-10 text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight max-w-3xl mb-6 text-[var(--app-text)]",
  titleGradient:
    "text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-violet-400",
  subtitle: `relative z-10 text-base md:text-lg ${appShell.textSubtle} max-w-lg mb-10 leading-relaxed`,
  voiceWrap: "relative z-10 w-full max-w-2xl mb-4 text-left",
  voiceCard: `${appShell.promptCard} p-4 md:p-5`,
  voiceHint: `text-sm ${appShell.textMuted} mb-1`,
  voiceSubmit: `${appShell.btnPrimary} w-full`,
  note: `relative z-10 text-xs ${appShell.textSubtle}`,
  statsGrid:
    "relative z-10 mx-4 md:mx-auto md:max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--app-hover-overlay)] rounded-2xl overflow-hidden mb-20",
  statCell: `${appShell.bgElevated} px-6 py-4 flex flex-col gap-0.5`,
  statLabel: `text-xs ${appShell.textSubtle} uppercase tracking-wider`,
  statValue: "text-xl font-bold tabular-nums",
  statUnit: `${appShell.textMuted} text-sm font-normal`,
  ctaSection: "text-center px-4 pb-24",
  ctaSubtitle: `${appShell.textMuted} text-sm mb-8 max-w-xs mx-auto`,
  ctaActions: "flex items-center justify-center gap-3 flex-wrap",
  ctaPrimary: appShell.btnPrimaryPill,
  ctaSecondary: appShell.btnSecondaryOutline,
  footer:
    "border-t border-[var(--app-border-subtle)] px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--app-text-subtle)]",
  footerLinks: "flex gap-6",
  footerLink: "hover:text-[var(--app-text-muted)] transition-colors",
} as const;
