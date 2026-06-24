---
name: frontend-feature
description: Adds or changes Next.js App Router UI in AI Music web app. Use when building pages, features, hooks, API integration, CSS modules, or ElevenLabs preview/status components.
---

# Frontend Feature (Next.js)

App: `apps/web` — Next.js App Router, React 19, **Tailwind** for UI styles.

**Обязательные правила:** [.cursor/rules/frontend-architecture.mdc](../../rules/frontend-architecture.mdc)

## Folder layout

```txt
src/
  app/                 Thin routes: page.tsx imports feature component
  features/<name>/     Screen logic, hooks/, components/, *-classes.ts
  entities/            Domain helpers (voice-sample, track, generation-job)
  shared/
    providers/         ApiProvider, app-wide context
    theme/             appShell, mp, mtk
    ui/                collapsible-lyrics, elevenlabs wrappers
    hooks/             use-polling-query, use-auth-ready
    lib/               parse-api-error
  components/ui/       shadcn / ElevenLabs UI (preview/status only)
```

## Page pattern

`app/<route>/page.tsx` — minimal:

```tsx
import { FeaturePanel } from "@/features/<name>/<component>";

export default function Page() {
  return <FeaturePanel />;
}
```

Business logic lives in `features/`, not in `app/`.

## Feature structure by complexity

| Complexity | Layout | State | Server data | Reference |
|------------|--------|-------|-------------|-----------|
| Simple | flat files | `useState` | `useQuery` | `profile`, `generation` |
| Medium | `hooks/`, `components/` | `useState` | `usePollingQuery` | `music-create` |
| Complex | `hooks/`, `store/`, `utils/` | Zustand | store-bound poll | `music-editor` |

Entry panel — композиция only (~150–200 строк). См. `music-create-panel.tsx`.

## Data fetching

- Use `useApi()` from `@/shared/providers/api-provider`.
- HTTP types from `@ai-music/api-client` and `@ai-music/shared`.
- Never call Suno/Kits directly from browser.
- Never trust client credit balance for gating — show API balance, server enforces.
- **Polling:** `usePollingQuery` from `@/shared/hooks/use-polling-query` until terminal status.
- **Errors:** `parseApiError(error, fallback)` from `@/shared/lib/parse-api-error`.
- **User-facing copy:** no vendor names (Suno, Kits, ElevenLabs) in UI strings — use **AI Music** or neutral wording. Internal code names are fine.

## Styling rules

- **Tailwind only** — `appShell`, shared maps (`mp`, `mtk`), feature maps (`mc`, `me`, `lp`, `pf`, `voiceUi`).
- **No cross-feature imports** of `*-classes.ts` — shared tokens → `shared/theme/` or `shared/ui/`.
- **No inline styles** except dynamic CSS variables for third-party widgets.
- CSS modules only for `:global()` overrides (e.g. waveform playlist).
- Legacy alias `mt` → use `mc` for music-create.

## ElevenLabs UI scope

Use for AI status / preview only (see `.cursor/rules/elevenlabs-ui-integration.mdc`):

- `Orb`, `Waveform`, `AudioPlayer*`, `Skeleton`, `ShimmeringText`, `Progress`
- Wrappers: `@/shared/ui/elevenlabs/*`

**Do not** use for timeline, mixer, regions, transport — custom `@waveform-playlist` + CSS modules in `music-editor/`.

## Client components

Add `"use client"` when using hooks, browser APIs, or event handlers.

## New feature checklist

```
- [ ] Route in app/ imports single feature entry component
- [ ] No cross-feature style imports
- [ ] parseApiError for all API errors
- [ ] usePollingQuery for server polling (if needed)
- [ ] Loading/empty states (Skeleton or LoadingPanel)
- [ ] No inline styles
- [ ] User-facing copy without vendor names (AI Music / neutral)
- [ ] Entry file < 500 lines; functions < 50 lines
- [ ] Shared schemas for forms match @ai-music/shared
```

## References

- UI patterns and tokens: [references/ui-patterns.md](references/ui-patterns.md)
- Architecture rules: [frontend-architecture.mdc](../../rules/frontend-architecture.mdc)
