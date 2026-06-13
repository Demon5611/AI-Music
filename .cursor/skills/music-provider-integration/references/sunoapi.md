# Suno API (sunoapi.org) — provider reference

Provider id: `sunoapi`. Implementation: `packages/ai-providers/src/music/providers/suno-api/`.

## Files

| File                     | Role                                    |
| ------------------------ | --------------------------------------- |
| `suno-api.provider.ts`   | `MusicProvider` implementation          |
| `suno-api.client.ts`     | HTTP calls                              |
| `suno-api.mapper.ts`     | Vendor status → domain types            |
| `suno-api.types.ts`      | Request/response shapes (internal only) |
| `suno-api.errors.ts`     | Suno-specific error mapping             |
| `suno-duration-hints.ts` | Duration via prompt/style hints         |

## Product constraints

- One request returns **2 track variants**.
- Non-custom prompt: max **500 characters**.
- Custom mode: `prompt` = lyrics; requires `style` + `title`.
- `style` in custom mode: comma-separated tags, **5–8 optimal** (UI caps at 7 chips); first tags weigh most. Max 200 chars (V4) / 1000 chars (V4_5+); project UI limit 200.
- Exact duration not supported — use `durationSec` hints in prompt/style.
- `callBackUrl` required by API; **polling remains primary** completion path.

## Flow

```txt
generateSong(input)
  → SunoApiClient.generateMusic() or uploadAndCover()
  → returns taskId (pending)
pollMusicUntilComplete(taskId)
  → getGenerationStatus → mapSunoMusicTaskToStatus
  → completed: tracks with audioUrl / streamAudioUrl
```

## Extend / stems

- `extendSong`: needs `audioId`, `continueAtSec`, prompt, style, title.
- `separateStems` / `getStemSeparationStatus`: optional on interface; used by editor.

## Domain mapping

Map raw Suno task states to:

```ts
type MusicGenerationStatus = "pending" | "processing" | "completed" | "failed";
```

Never expose Suno task JSON to frontend DTOs — use `music-record.mapper.ts`.

## Common pitfalls

- Importing `SunoGenerateMusicRequest` outside `suno-api/` folder.
- Assuming single track per generation (always handle 2 variants).
- Blocking HTTP request until Suno completes (use poll in worker/service).
- Missing `SUNO_API_KEY` — check `getMusicTestStatus().configured` before prod paths.
