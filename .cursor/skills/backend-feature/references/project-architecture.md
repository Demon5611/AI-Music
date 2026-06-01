# Backend project architecture

## Apps

### apps/api

Fastify server on port `API_PORT` (default 3001).

```txt
src/
  main.ts              buildApp(), route registration, error handler
  common/
    errors.ts          AppError hierarchy
    require-auth.ts    preHandler
    load-env.ts
  modules/
    auth/              Clerk/dev auth, sync user + demo credits
    credits/           Ledger spend/refund/balance
    billing/           Stripe (stub)
    generations/       User generation jobs + queue enqueue
    music/             Music test/history, Suno-backed records
    music-editor/      Songs, regions, render, voice transfer
    voice-samples/     Upload, consent, Kits model link
    kits/              Kits API proxy
    queue/             BullMQ generation queue
    storage/           StorageService + key builders
    tracks/            Published tracks
    users/             Profile endpoints
```

### apps/worker

Separate process: `pnpm dev:worker`.

```txt
src/
  index.ts
  generation.worker.ts
  processors/
    generate-song.ts      Main pipeline orchestrator
    preprocess-voice.ts
    convert-voice.ts      Suno + Kits
    upload-result.ts      Track + storage
  common/
    local-storage.ts      Worker-side file write (mirror API keys)
```

## Request lifecycle

```txt
Client → Fastify route → requireAuth → Zod parse → service.ts
  → prisma / MusicService / getStorageService / enqueueGenerationJob
  → mapper → JSON DTO
```

## Error codes

| Class                    | HTTP | Code                 |
| ------------------------ | ---- | -------------------- |
| UnauthorizedError        | 401  | UNAUTHORIZED         |
| ForbiddenError           | 403  | FORBIDDEN            |
| NotFoundError            | 404  | NOT_FOUND            |
| InsufficientCreditsError | 402  | INSUFFICIENT_CREDITS |
| BadRequestError          | 400  | BAD_REQUEST          |

Global handler in `main.ts` catches unhandled errors → 500.

## Auth

- Production: Clerk JWT via `create-auth-verifier.ts`
- Dev: `dev-auth.ts` token
- `syncAuthUser` on first request — creates user + `FREE_DEMO_CREDITS`

## Storage abstraction

```ts
interface StorageService {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
```

Current: `LocalStorageService`. Keys:

- `voice-samples/{userId}/{sampleId}.{ext}`
- `music-generations/{userId}/{generationId}/{trackId}.mp3`
- `songs/{userId}/{songId}/stems|renders|replacements/...`

## Queue

Redis URL: `REDIS_URL`. Payload: `GenerationJobPayload` from shared.

API enqueues after DB job + credit spend. Worker is idempotent for completed/failed jobs.
