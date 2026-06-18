---
name: music-provider-integration
description: Integrates music and voice AI providers (Suno API, Kits.ai). Use when adding or changing MusicProvider, voice transfer, polling, provider errors, or MUSIC_PROVIDER env switching.
---

# Music Provider Integration

## Architecture

Business code depends on interfaces, not vendor HTTP:

- **Music generation**: `MusicProvider` in `packages/ai-providers/src/music/domain/`
- **Kits client** (optional integrations): `createKitsClient()` in `packages/ai-providers/src/kits/`

Switch provider via `MUSIC_PROVIDER` env (`sunoapi` is production default).

## Adding a music provider

1. Implement `MusicProvider` in `packages/ai-providers/src/music/providers/<vendor>/`.
2. Map vendor statuses to `MusicGenerationStatus`: `pending | processing | completed | failed`.
3. Register in `MusicProviderFactory` registry.
4. Keep vendor types inside provider folder (`*.types.ts`, `*.mapper.ts`, `*.errors.ts`).
5. Expose config via `resolveMusicProviderConfig()` — never read env in routes.

## Polling

- Music: `pollMusicUntilComplete(musicService, taskId)` — primary completion path.
- Kits jobs: `pollUntilComplete()` with `isKitsJobSuccess` / `isKitsJobFailed`.
- Webhooks optional; do not rely on them alone.

## Error handling

Throw typed errors from `packages/ai-providers/src/music/domain/errors/`:

- `MusicProviderError`, `MusicGenerationFailedError`, `MusicTimeoutError`
- Map to HTTP in API via `handle-music-error.ts` / `sendMusicError`.

API routes must not parse raw vendor JSON.

## Worker vs API

| Operation                 | Where                                                       |
| ------------------------- | ----------------------------------------------------------- |
| Start generation          | API creates DB record, may call `MusicService.generateSong` |
| Poll until done           | Worker or service layer, not React                          |
| Download audio to storage | API `music-record.service.ts` or worker `upload-result.ts`  |
| Suno Voice persona (create flow)   | API `suno-voice.service.ts` — см. [suno-voice-flow.md](references/suno-voice-flow.md) |

## Suno Voice (create pipeline)

Create-flow — два шага записи:

1. Главная: свободный сэмпл → `VoiceSample`
2. `/consent`: фраза Suno + верификация → `sunoVoiceId` → генерация на `/music-create`

Подробно: [references/suno-voice-flow.md](references/suno-voice-flow.md)

## Env (music)

```txt
MUSIC_PROVIDER=sunoapi
SUNO_API_KEY=
SUNO_API_BASE_URL=https://api.sunoapi.org
SUNO_API_MODEL=V4_5ALL
SUNO_CALLBACK_URL=http://localhost:3001/api/music/callback/suno
SUNO_POLL_INTERVAL_MS=5000
SUNO_POLL_TIMEOUT_MS=600000
KITS_API_KEY=
KITS_API_BASE_URL=https://arpeggi.io/api/kits/v1
SUNO_FILE_UPLOAD_BASE_URL=https://sunoapiorg.redpandaai.co
SUNO_VOICE_LANGUAGE=ru
```

## References

- Suno API specifics: [references/sunoapi.md](references/sunoapi.md)
- **Suno Voice user flow (две записи, consent, persona):** [references/suno-voice-flow.md](references/suno-voice-flow.md)
- Kits.ai voice API: [references/kits-ai.md](references/kits-ai.md)
