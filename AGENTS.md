# AI Music — Agent Guide

Monorepo: AI Music Editor (voice + generation + timeline editor).

Stack: Next.js (`apps/web`), Fastify API (`apps/api`), BullMQ worker (`apps/worker`), Prisma/PostgreSQL, `@ai-music/ai-providers`.

## Global rules

Always follow:

- [.cursor/rules/project-rules.md](.cursor/rules/project-rules.md) — coding standards, security, file limits
- [.cursor/rules/elevenlabs-ui-integration.mdc](.cursor/rules/elevenlabs-ui-integration.mdc) — ElevenLabs UI scope (preview/status only, not timeline)

## Skills index

Project skills live in `.cursor/skills/`. Read the full `SKILL.md` when the task matches.

| Skill                         | Path                                                                                           | When to use                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| project-architecture-analysis | [.cursor/skills/project-architecture-analysis/](.cursor/skills/project-architecture-analysis/) | Planning, new module, pattern choice, strategic decisions |
| backend-feature               | [.cursor/skills/backend-feature/](.cursor/skills/backend-feature/)                             | Fastify routes, services, worker, queue, storage          |
| frontend-feature              | [.cursor/skills/frontend-feature/](.cursor/skills/frontend-feature/)                           | Next.js pages, features, hooks, CSS modules, API client   |
| music-provider-integration    | [.cursor/skills/music-provider-integration/](.cursor/skills/music-provider-integration/)       | Suno, Kits, MusicProvider, polling, voice transfer        |
| credits-billing               | [.cursor/skills/credits-billing/](.cursor/skills/credits-billing/)                             | Credits ledger, spend/refund, Stripe checkout/webhook     |
| db-prisma-postgres            | [.cursor/skills/db-prisma-postgres/](.cursor/skills/db-prisma-postgres/)                       | Schema, models, migrations, Prisma queries                |
| code-review-ai-music          | [.cursor/skills/code-review-ai-music/](.cursor/skills/code-review-ai-music/)                   | PR review, diff review, pre-merge checks                  |

Reference files (read on demand, not upfront):

- `music-provider-integration/references/sunoapi.md`
- `music-provider-integration/references/suno-voice-flow.md` — две записи, consent, Suno persona
- `music-provider-integration/references/kits-ai.md`
- `credits-billing/references/pricing-model.md`
- `backend-feature/references/project-architecture.md`
- `frontend-feature/references/ui-patterns.md`

## Architecture shortcuts

```txt
packages/ai-providers/   MusicProvider, Kits, voice transfer
packages/shared/         Zod schemas, constants (credit costs)
packages/db/             Prisma schema + client
packages/api-client/     Typed HTTP client for web
apps/api/src/modules/    Feature modules (routes + service)
apps/worker/             Long-running generation pipeline
```

Key patterns: provider abstraction, BullMQ queue, credits ledger, StorageService, thin routes.

## Commands

```bash
pnpm dev              # all apps
pnpm dev:web          # Next.js
pnpm dev:api          # Fastify
pnpm dev:worker       # BullMQ worker
pnpm db:generate      # prisma generate
pnpm db:push          # push schema (dev)
pnpm typecheck        # turbo typecheck
```
