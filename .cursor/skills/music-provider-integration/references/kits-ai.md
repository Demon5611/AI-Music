# Kits.ai — voice transfer reference

Kits is **voice transfer**, not music generation. Music gen uses Suno; vocals are converted via Kits.

## Files

| File                                             | Role                                        |
| ------------------------------------------------ | ------------------------------------------- |
| `kits/kits-client.ts`                            | HTTP: voice models, conversions, separation |
| `kits/create-kits-client.ts`                     | Factory from env                            |
| `kits/poll.ts`                                   | Generic poll + `downloadUrl`                |
| `kits/kits-api-error.ts`                         | Normalized API errors                       |
| `voice-transfer/kits-voice-transfer.provider.ts` | `VoiceTransferProvider`                     |

## API surface used

- `GET /voice-models` — list/search models (paginated)
- `GET /voice-models/:id` — single model
- `POST /voice-conversions` — multipart: `voiceModelId`, `soundFile`
- `GET /voice-conversions/:id` — poll job status

Job statuses: `running` → `success` | `error` | `cancelled`.

## Integration points

| Layer                              | Usage                                            |
| ---------------------------------- | ------------------------------------------------ |
| API `modules/kits/routes.ts`       | Proxy for web test + model listing               |
| `VoiceSample.kitsVoiceModelId`     | Link user sample to Kits model before generation |
| Worker `convert-voice.ts`          | Full pipeline voice conversion                   |
| Editor `voice-transfer.service.ts` | Replace vocal region in song                     |

## Flow (voice conversion)

```txt
createVoiceConversion({ voiceModelId, soundFile })
  → job id, status running
pollUntilComplete(getVoiceConversion)
  → outputFileUrl
download → Buffer → StorageService.put
```

## Frontend

- Model picker: `voice-transfer-dialog.tsx` (ElevenLabs UI for status only).
- Pagination helpers: `kits-voice-models.ts`.
- API calls via `@ai-music/api-client` `kits` module, not direct Kits key in browser.

## Env

```txt
KITS_API_KEY=
KITS_API_BASE_URL=https://api.kits.ai
```

## Security

- Kits API key lives on server only (`apps/api`, `apps/worker`).
- Never expose key to Next.js client bundle.

## Error handling

Use `handle-kits-error.ts` in API routes. Map to user-safe messages; log vendor body server-side only.
