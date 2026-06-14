# Frontend UI patterns

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

Not ElevenLabs UI:

- `waveform-timeline.tsx`, `track-lane`, `transport-controls`
- `@waveform-playlist/*` for timeline
- `audio-editor-store.ts` (Zustand) for editor state
- dnd-kit for drag operations

## Forms

- Consent phrase: `VOICE_CONSENT_PHRASE` from shared constants.
- Style picker: `MUSIC_STYLES` constant.
- Validate client-side for UX; server re-validates with Zod.

## Error display

Parse API `{ error, code }` responses. Example: `features/kits-test/parse-api-error.ts`.

Show user-safe message; log details only in dev if needed.

## Auth pages

Clerk: `app/sign-in/[[...sign-in]]/page.tsx`. Middleware in `middleware.ts`.

## File naming

- Components: PascalCase `voice-transfer-dialog.tsx`
- Hooks: `use-*.ts`
- Styles: kebab-case `music-editor.module.css`
