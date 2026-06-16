import { appShell } from "@/shared/theme/app-theme";

/** Profile page — Tailwind via app tokens. */
export const pf = {
  section: "mx-auto max-w-lg px-6 py-8",
  title: "mb-6 text-[1.75rem] font-semibold text-[var(--app-text)]",
  details: "mb-8 flex flex-col gap-4",
  row: "grid grid-cols-[6rem_1fr] items-baseline gap-3",
  label: "text-sm text-[var(--app-text-muted)]",
  value: "text-[0.9375rem] text-[var(--app-text)]",
  actions: "flex flex-wrap gap-3",
  primaryLink: appShell.formSubmit,
  secondaryLink: appShell.btnSecondary,
  status: "px-6 py-8 text-[var(--app-text-muted)]",
  errorBox: "mx-auto max-w-lg px-6 py-8",
  error: "mb-3 text-sm text-rose-600 dark:text-rose-400",
  hint: "text-sm text-[var(--app-text-muted)]",
} as const;
