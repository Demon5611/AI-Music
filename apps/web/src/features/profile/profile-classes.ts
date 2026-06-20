import { appShell } from "@/shared/theme/app-theme";

/** Profile page — Tailwind via app tokens. */
export const pf = {
  section: "mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8",
  title: "mb-6 text-2xl font-semibold text-[var(--app-text)] sm:text-[1.75rem]",
  details: "mb-8 flex flex-col gap-4",
  row: "flex flex-col gap-1 sm:grid sm:grid-cols-[6rem_1fr] sm:items-baseline sm:gap-3",
  label: "text-sm text-[var(--app-text-muted)]",
  value: "text-[0.9375rem] text-[var(--app-text)]",
  actions: "flex flex-col gap-3 sm:flex-row sm:flex-wrap",
  primaryLink: appShell.formSubmit,
  secondaryLink: appShell.btnSecondary,
  status: "px-4 py-8 text-[var(--app-text-muted)] sm:px-6",
  errorBox: "mx-auto max-w-lg px-4 py-8 sm:px-6",
  error: "mb-3 text-sm text-rose-600 dark:text-rose-400",
  hint: "text-sm text-[var(--app-text-muted)]",
} as const;
