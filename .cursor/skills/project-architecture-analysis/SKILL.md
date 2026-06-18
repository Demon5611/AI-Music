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
4. Does it cost credits? If yes, `spendCredits` / `refundCredits` in `packages/db/src/credits-ledger.ts` (API wrapper in `credits/service.ts`).
5. Does it store files? If yes, `StorageService` + `build*Key` from `packages/shared/src/storage/keys.ts`.
6. Does it need frontend polling? If yes, `usePollingQuery` on web, not ad-hoc `setInterval` (except editor store-bound poll).

## Preferred patterns (this repo)

| Concern          | Pattern                                           | Location                                      |
| ---------------- | ------------------------------------------------- | --------------------------------------------- |
| Music APIs       | `MusicProvider` interface + factory               | `packages/ai-providers/src/music/`            |
| Voice transfer   | `VoiceTransferProvider` (Kits)                    | `packages/ai-providers/src/voice-transfer/`   |
| Async generation | BullMQ queue + worker processors                  | `apps/api/src/modules/queue/`, `apps/worker/` |
| Credits          | Append-only ledger (`CreditTransaction`)          | `packages/db/src/credits-ledger.ts`           |
| Files            | `StorageService` + shared key builders            | `@ai-music/shared` keys, API `storage/`       |
| Frontend polling | `usePollingQuery` until terminal status           | `apps/web/src/shared/hooks/`                  |
| Frontend errors  | `parseApiError`                                   | `apps/web/src/shared/lib/`                    |
| API validation   | Zod schemas in `@ai-music/shared`                 | `packages/shared/src/schemas/`                |
| HTTP routes      | Fastify `register*Routes`, auth via `requireAuth` | `apps/api/src/modules/*/routes.ts`            |
| Frontend data    | `@ai-music/api-client` via `useApi()`             | `apps/web/src/shared/providers/`              |

## Anti-patterns

- Importing Suno/Kits HTTP types in API routes or React components.
- Synchronous music generation inside Fastify request handler.
- Computing credit balance on frontend or trusting client `amount`.
- Duplicating `build*Key` in api/worker instead of `@ai-music/shared`.
- Inline `prisma.creditTransaction.create` in worker instead of `refundCredits`.
- Cross-feature imports of `*-classes.ts` on web.
- Local copies of `parseApiError` instead of shared helper.
- `setInterval` polling on web when `usePollingQuery` fits.
- Inline styles in React (use Tailwind maps or shared UI tokens).
- New abstraction with only one implementation and no planned second vendor.
- `apps/api/src/modules/kits/` proxy module — Kits lives in `ai-providers`.

## Related skills

- Backend module: [backend-feature](../backend-feature/SKILL.md)
- Frontend conventions: [frontend-architecture.mdc](../../rules/frontend-architecture.mdc)
- Music vendors: [music-provider-integration](../music-provider-integration/SKILL.md)
- Credits/Stripe: [credits-billing](../credits-billing/SKILL.md)
- Database: [db-prisma-postgres](../db-prisma-postgres/SKILL.md)
