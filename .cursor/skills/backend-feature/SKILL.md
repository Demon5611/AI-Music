---
name: backend-feature
description: Adds or changes Fastify API modules in AI Music monorepo. Use when creating routes, services, queues, auth, storage, or API error handling in apps/api or apps/worker.
---

# Backend Feature (Fastify)

Stack: **Fastify** (not NestJS), ESM, `apps/api` + `apps/worker`.

## Module structure

Each feature lives in `apps/api/src/modules/<name>/`:

```txt
routes.ts      HTTP registration, validation, auth preHandler
service.ts     Business logic, Prisma, external calls
mapper.ts      DB/domain → DTO (optional)
handle-*-error.ts   Provider-specific error mapping (optional)
```

Register in `apps/api/src/main.ts` via `register*Routes(app)`.

## Route pattern

```ts
app.post("/api/resource", { preHandler: requireAuth }, async (request, reply) => {
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
  try {
    const result = await doSomething(request.userId!, parsed.data);
    return reply.send(result);
  } catch (error) {
    return sendAppError(reply, error);
  }
});
```

Rules:

- Routes stay thin — no Prisma in routes if service exists.
- Validate with Zod from `@ai-music/shared`.
- Auth: `requireAuth` preHandler; `request.userId` is set by auth plugin.
- Errors: throw `AppError` subclasses; `sendAppError` in catch.

## Service layer

- Import `prisma` from `@ai-music/db`.
- AI calls via `@ai-music/ai-providers`, not raw fetch to Suno/Kits.
- File I/O via `getStorageService()` + key builders from `storage/storage.service.ts`.
- Long jobs: create DB record → `enqueueGenerationJob()` → worker processes.

## Worker processors

Location: `apps/worker/src/processors/`.

Pattern from `generate-song.ts`:

1. Load job, skip if terminal state.
2. Update status through pipeline stages.
3. On error: set `failed`, refund credits with reason.

Queue: BullMQ, name `GENERATION_QUEUE_NAME` from shared constants.

## Shared packages

| Package                  | Use                               |
| ------------------------ | --------------------------------- |
| `@ai-music/shared`       | Schemas, constants, payload types |
| `@ai-music/db`           | Prisma client                     |
| `@ai-music/ai-providers` | Music/Kits providers              |

## New feature checklist

```
- [ ] Zod schema in packages/shared if request body is shared with client
- [ ] routes.ts + service.ts under modules/<name>/
- [ ] register*Routes in main.ts
- [ ] AppError for expected failures
- [ ] Credits spend/refund if billable
- [ ] Queue worker if > few seconds
- [ ] Storage keys via build*Key helpers
- [ ] No secrets in logs or responses
```

## References

- Full architecture map: [references/project-architecture.md](references/project-architecture.md)
