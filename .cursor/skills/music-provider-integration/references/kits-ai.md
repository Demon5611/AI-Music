# Kits.ai — client reference

Kits HTTP client lives in `packages/ai-providers/src/kits/`. Editor **Replace vocal** was removed; Kits is not used in the music editor UI.

## Files

| File                         | Role                                        |
| ---------------------------- | ------------------------------------------- |
| `kits/kits-client.ts`        | HTTP: voice models, conversions, separation |
| `kits/create-kits-client.ts` | Factory from env                            |
| `kits/poll.ts`               | Generic poll + `downloadUrl`                |
| `kits/kits-api-error.ts`     | Normalized API errors                       |

## API surface (client)

- `GET /voice-models` — list/search models (paginated)
- `GET /voice-models/:id` — single model
- `POST /voice-conversions` — multipart: `voiceModelId`, `soundFile`
- `GET /voice-conversions/:id` — poll job status

## Integration points

| Layer                     | Usage                                             |
| ------------------------- | ------------------------------------------------- |
| `VoiceSample.sunoVoiceId` | Suno Voice persona for create-pipeline generation |
| Worker `convert-voice.ts` | Full pipeline (Suno persona, not Kits)            |

## Env

```txt
KITS_API_KEY=
KITS_API_BASE_URL=https://api.kits.ai
```

## Security

- Kits API key lives on server only (`apps/api`, `apps/worker`).
- Never expose key to Next.js client bundle.

## Voice sample recording (UI)

Short reference sample (10–120 sec) before linking a Kits voice model. Tips follow Kits training guides:

- [Recording environment](https://docs.kits.ai/train/recording-environment) — quiet room, no reverb/headphone bleed
- [Volume level](https://docs.kits.ai/train/volume-level) — moderate levels, avoid clipping
- [File quality](https://docs.kits.ai/train/file-quality-settings) — WAV/MP3/FLAC, 44.1/48 kHz
- [Voice conversion API](https://docs.kits.ai/api-reference/api-endpoints/voice-conversion-api/create-new-voice-conversion-job) — accepts wav/mp3/flac, max 100MB

UI: `VoiceRecordingTipsPanel` in `voice-upload-panel.tsx`.

## Error handling

Map Kits errors in API routes when adding new Kits integrations. Log vendor body server-side only.
