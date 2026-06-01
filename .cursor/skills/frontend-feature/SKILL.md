---
name: frontend-feature
description: Adds or changes Next.js App Router UI in AI Music web app. Use when building pages, features, hooks, API integration, CSS modules, or ElevenLabs preview/status components.
---

# Frontend Feature (Next.js)

App: `apps/web` — Next.js App Router, React 19, CSS modules.

## Folder layout

```txt
src/
  app/                 Thin routes: page.tsx imports feature component
  features/<name>/     Screen logic, hooks, styles/
  entities/            Domain types re-exports (optional)
  shared/
    providers/         ApiProvider, app-wide context
    ui/                Project UI + elevenlabs wrappers
    hooks/
    config/
  components/ui/       shadcn / ElevenLabs UI (preview/status only)
  lib/utils.ts
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

## Data fetching

- Use `useApi()` from `@/shared/providers/api-provider`.
- HTTP types from `@ai-music/api-client` and `@ai-music/shared`.
- Never call Suno/Kits directly from browser.
- Never trust client credit balance for gating — show API balance, server enforces.

## Styling rules

- **No inline styles** — CSS modules (`*.module.css`) or Tailwind classes in markup.
- Project tokens in `globals.css`: `--muted` = text, `--muted-bg` = shadcn background.
- Feature styles in `features/<name>/styles/`.

## ElevenLabs UI scope

Use for AI status / preview only (see `.cursor/rules/elevenlabs-ui-integration.mdc`):

- `Orb`, `Waveform`, `AudioPlayer*`, `Skeleton`, `ShimmeringText`, `Progress`
- Wrappers: `@/shared/ui/elevenlabs/*`

**Do not** use for timeline, mixer, regions, transport — custom `@waveform-playlist` + CSS modules in `music-editor/`.

## Client components

Add `"use client"` when using hooks, browser APIs, or event handlers.

Polling pattern: `use-editor-polling.ts`, generation status pages.

## New feature checklist

```
- [ ] Route in app/ imports single feature entry component
- [ ] Feature folder: component + styles.module.css
- [ ] API via useApi(), errors parsed consistently (see parse-api-error.ts)
- [ ] Loading/empty states (Skeleton or LoadingPanel)
- [ ] No inline styles
- [ ] Shared schemas for forms match @ai-music/shared
```

## References

- UI patterns and tokens: [references/ui-patterns.md](references/ui-patterns.md)
