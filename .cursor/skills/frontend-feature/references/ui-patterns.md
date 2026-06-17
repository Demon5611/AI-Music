# Frontend UI patterns

## Styling (required)

- **Always use Tailwind** for UI styles. Map shared tokens via `appShell` (`@/shared/theme/app-theme`) or feature maps (`lp`, `mt`, `me`).
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
  music-create-classes.ts
  song-track-result.tsx
  collapsible-lyrics.tsx
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

## Error display

Parse API `{ error, code }` responses from backend modules (e.g. music editor Kits errors).

Show user-safe message; log details only in dev if needed.

## Auth pages

Clerk: `app/sign-in/[[...sign-in]]/page.tsx`. Middleware in `middleware.ts`.

## File naming

- Components: PascalCase `voice-transfer-dialog.tsx`
- Hooks: `use-*.ts`
- Styles: kebab-case `music-editor-classes.ts` (Tailwind map `me`), not CSS modules for layout/components
