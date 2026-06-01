---
name: project-architecture-analysis
description: Use when analyzing the project, planning architecture, creating a new module, choosing patterns, or making strategic technical decisions.
---

# Project Architecture Analysis

## Rules

Prefer proven architecture patterns.
Start from current repository structure.
Do not introduce new architecture without explaining tradeoffs.
Respect YAGNI: avoid abstractions without real need.
For AI Music project prefer:

- provider abstraction for music APIs
- queue for long-running generation
- ledger for credits
- storage abstraction for files
- thin controllers
- service/use-case layer for business logic

## Monorepo layout

```txt
apps/
  api/       Fastify REST API (thin routes, service layer)
  web/       Next.js App Router frontend
  worker/    BullMQ processors for long-running jobs
packages/
  ai-providers/   MusicProvider, Kits, voice transfer
  api-client/     Typed HTTP client for web/mobile
  db/             Prisma schema + client
  shared/         Zod schemas, constants, shared types
```

## Decision checklist

Before adding a new layer or package, answer:

1. Does existing module structure cover this? (`apps/api/src/modules/<feature>/`)
2. Is the operation long-running? If yes, use BullMQ worker, not request handler.
3. Does it touch external AI vendor? If yes, go through `@ai-music/ai-providers`.
4. Does it cost credits? If yes, ledger transaction in `credits/service.ts`.
5. Does it store files? If yes, `StorageService` + key builders in `storage/storage.service.ts`.

## Preferred patterns (this repo)

| Concern          | Pattern                                           | Location                                      |
| ---------------- | ------------------------------------------------- | --------------------------------------------- |
| Music APIs       | `MusicProvider` interface + factory               | `packages/ai-providers/src/music/`            |
| Voice transfer   | `VoiceTransferProvider` (Kits)                    | `packages/ai-providers/src/voice-transfer/`   |
| Async generation | BullMQ queue + worker processors                  | `apps/api/src/modules/queue/`, `apps/worker/` |
| Credits          | Append-only ledger (`CreditTransaction`)          | `apps/api/src/modules/credits/`               |
| Files            | `StorageService` (local now, R2 later)            | `apps/api/src/modules/storage/`               |
| API validation   | Zod schemas in `@ai-music/shared`                 | `packages/shared/src/schemas/`                |
| HTTP routes      | Fastify `register*Routes`, auth via `requireAuth` | `apps/api/src/modules/*/routes.ts`            |
| Frontend data    | `@ai-music/api-client` via `useApi()`             | `apps/web/src/shared/providers/`              |

## Anti-patterns

- Importing Suno/Kits HTTP types in API routes or React components.
- Synchronous music generation inside Fastify request handler.
- Computing credit balance on frontend or trusting client `amount`.
- Inline styles in React (use CSS modules or shared UI tokens).
- New abstraction with only one implementation and no planned second vendor.

## Related skills

- Backend module: [backend-feature](../backend-feature/SKILL.md)
- Music vendors: [music-provider-integration](../music-provider-integration/SKILL.md)
- Credits/Stripe: [credits-billing](../credits-billing/SKILL.md)
- Database: [db-prisma-postgres](../db-prisma-postgres/SKILL.md)
