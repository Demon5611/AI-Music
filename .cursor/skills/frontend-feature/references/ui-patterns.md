# Frontend UI patterns

**Cursor rules (always apply):** [.cursor/rules/frontend-architecture.mdc](../../../rules/frontend-architecture.mdc)

## Styling (required)

- **Always use Tailwind** for UI styles. Map shared tokens via `appShell` (`@/shared/theme/app-theme`), shared maps (`mp`, `mtk`), or feature maps (`lp`, `mc`, `me`, `voiceUi`).
- **No inline styles** except dynamic CSS variables required by third-party widgets (e.g. `--track-progress` on timeline).
- **CSS modules** only for `:global()` overrides of external libraries (`music-editor-playlist.module.css` for `@waveform-playlist`).
- Theme: `next-themes` toggles `.dark` on `<html>`; colors use `var(--app-*)` from `globals.css`.

## CSS tokens (globals.css)

Project CSS modules use:

- `--background`, `--foreground`, `--surface`, `--border`
- `--muted` — secondary **text** (not background)

shadcn / ElevenLabs use:

- `--muted-bg` — muted **background**
- `--muted-foreground` — secondary text in shadcn components

Do not overwrite `--muted` with shadcn background values.

## Feature module example

```txt
features/music-create/
  music-create-panel.tsx
  music-create-classes.ts       # mc — form UI
  hooks/
  components/
  song-track-result.tsx

shared/
  theme/music-page-classes.ts   # mp — page chrome (create, history)
  theme/music-track-classes.ts  # mtk — track cards, lyrics, history list
  ui/collapsible-lyrics.tsx
  lib/parse-api-error.ts
```

Shared Tailwind tokens: `import { appShell } from "@/shared/theme/app-theme"`.
Theme toggle: `next-themes` via `ThemeProvider` + `ThemeToggle` in header.

## API provider

`ClerkApiProvider` / `DevApiProvider` wrap app in `app-providers.tsx`.

```tsx
const api = useApi();
const history = await api.music.getHistory();
```

Base URL from `env.apiUrl`. Token from Clerk `getToken()` or dev auth.

## Status and preview (ElevenLabs layer)

Generation / voice transfer waiting states:

```tsx
import { AiProcessingStatus, LoadingPanel } from "@/shared/ui/elevenlabs";
```

Audio preview (not timeline):

```tsx
import { AudioPreviewPlayer } from "@/shared/ui/elevenlabs/audio-preview-player";
```

## Music editor (custom stack)

Not ElevenLabs UI. Styles: Tailwind via `me` from `music-editor-classes.ts`.

- `waveform-timeline.tsx`, `track-lane`, `transport-controls`
- `@waveform-playlist/*` for timeline — playlist `:global` CSS in `styles/music-editor-playlist.module.css` only
- `audio-editor-store.ts` (Zustand) for editor state
- dnd-kit for drag operations

## Forms

- Consent phrase: `VOICE_CONSENT_PHRASE` from shared constants.
- Style picker: `MUSIC_STYLES` constant.
- Validate client-side for UX; server re-validates with Zod.

### Voice create flow (две записи)

Продуктовый flow и тексты для UI — в  
[music-provider-integration/references/suno-voice-flow.md](../../music-provider-integration/references/suno-voice-flow.md).

| Шаг | Компонент | Сообщение пользователю |
|-----|-----------|------------------------|
| Главная | `VoiceUploadPanel` | Свободный сэмпл; предупредить, что дальше будет фраза Suno |
| `/consent` | `SunoVoiceVerifyPanel` | Фраза от Suno, запись **напевом** |
| `/music-create` | `MusicCreatePanel` | Генерация только после `voiceCloneStatus: ready` |

На главной не обещать «голос готов» до прохождения `/consent`.

## Feature structure decision tree

| Complexity | Folder layout | Client state | Server data | Reference |
|------------|---------------|--------------|-------------|-----------|
| Simple (one screen, CRUD) | flat files | `useState` | `useQuery`, no polling | `profile`, `generation` |
| Medium (form + side effects) | `use-*.ts` in root or `hooks/` | `useState` + refs | `useQuery` or `usePollingQuery` | `music-create` |
| Complex (realtime editor) | `hooks/`, `store/`, `utils/`, `styles/` | **Zustand** | custom `useEffect` polling when tied to store | `music-editor` |

Rules:

- **React Query** — server state; use `refetchInterval` or `usePollingQuery` until terminal status.
- **Zustand** — editor UI state only (`audio-editor-store`).
- **setInterval polling** — only when refresh depends on client store (e.g. `use-editor-polling` + `songStatus`).
- **No cross-feature style imports** — use `shared/theme/*`, `shared/ui/*`, or `entities/*`.
- **API errors** — `parseApiError(error, fallback)` from `@/shared/lib/parse-api-error`.

## Error display

Use `parseApiError` from `@/shared/lib/parse-api-error` for all API error messages.

Parse API `{ error, code }` responses from backend modules (e.g. music editor Kits errors).

Show user-safe message; log details only in dev if needed.

## Auth pages

Clerk: `app/sign-in/[[...sign-in]]/page.tsx`. Middleware in `middleware.ts`.

## File naming

- Components: PascalCase `voice-transfer-dialog.tsx`
- Hooks: `use-*.ts`
- Styles: kebab-case `music-editor-classes.ts` (Tailwind map `me`), not CSS modules for layout/components
