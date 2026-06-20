import { appShell } from "@/shared/theme/app-theme";

export const pricing = {
  page: "mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12",
  title: "mb-2 text-center text-3xl font-semibold text-[var(--app-text)]",
  subtitle: "mb-10 text-center text-sm text-[var(--app-text-muted)] sm:text-base",
  grid: "grid gap-4 md:grid-cols-2 xl:grid-cols-4",
  card: [
    "flex h-full flex-col rounded-2xl border border-[var(--app-border-subtle)]",
    "bg-[var(--app-bg-surface)] p-5",
  ].join(" "),
  cardCurrent: "border-violet-500/60 ring-1 ring-violet-500/30",
  cardHeader: "mb-4",
  planName: "text-lg font-semibold text-[var(--app-text)]",
  planPrice: "mt-1 text-2xl font-semibold text-[var(--app-text)]",
  planPriceHint: "text-sm font-normal text-[var(--app-text-muted)]",
  credits: "mt-2 text-sm text-[var(--app-text-muted)]",
  featureList: "mt-4 flex flex-1 flex-col gap-2 text-sm text-[var(--app-text-muted)]",
  featureItem: "flex items-start gap-2",
  featureBullet: "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500",
  actionWrap: "mt-6",
  primaryButton: appShell.formSubmit,
  secondaryButton: appShell.btnSecondary,
  disabledButton: [
    appShell.btnSecondary,
    "cursor-not-allowed opacity-60",
  ].join(" "),
  notice: "mt-8 rounded-xl border border-[var(--app-border-subtle)] bg-[var(--app-bg-surface)] p-4 text-sm text-[var(--app-text-muted)]",
  error: "mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300",
} as const;
