---
name: db-prisma-postgres
description: Manages Prisma schema, migrations, and PostgreSQL data access for AI Music. Use when adding models, relations, indexes, queries, or running db:generate/db:push.
---

# Database (Prisma + PostgreSQL)

Schema: `packages/db/prisma/schema.prisma`
Client: `packages/db/src/index.ts` — singleton `prisma` export.

## Commands

```bash
pnpm db:generate    # prisma generate
pnpm db:push        # push schema to dev DB (no migration file)
```

Docker Postgres: `pnpm docker:up` (see repo docker-compose).

## Conventions

- Table names: snake_case via `@@map("table_name")`.
- Column names: snake_case via `@map("column_name")`.
- IDs: `cuid()` string primary keys.
- Timestamps: `createdAt`, `updatedAt` where entity is mutable.
- Status fields: `String` enum-like values documented in code (no Prisma enum unless stable).

## Core models

| Model                           | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| User                            | Auth identity                                 |
| VoiceSample                     | Uploaded voice + Kits model link              |
| GenerationJob                   | Full pipeline job (voice → song → conversion) |
| Track                           | Final user track + share slug                 |
| MusicGeneration                 | Suno task history (test/editor import)        |
| MusicGenerationTrack            | Variants from one Suno task                   |
| Song / SongVersion / SongRegion | Editor state                                  |
| EditOperation                   | Undo/redo log                                 |
| RenderJob                       | Export render queue                           |
| CreditTransaction               | Credits ledger                                |

## Query patterns

- **User scoping**: always filter `where: { userId }` in services.
- **Balance**: `aggregate({ _sum: { amount } })` on `CreditTransaction`.
- **Transactions**: `prisma.$transaction` for spend + create job.
- **Includes**: minimal selects in list endpoints; full include only when needed.

## Adding a model

1. Edit `schema.prisma`.
2. Add relation indexes for foreign keys and common filters.
3. `pnpm db:generate` — update client types.
4. Export type from `packages/db/src/index.ts` if used externally.
5. Add service functions in API module, not in routes.

## Migrations note

Project currently uses `db:push` for dev velocity. For production, prefer `prisma migrate dev` when team agrees on migration workflow.

## Do not

- Store credit balance on `User` — use ledger sum.
- Store API keys or secrets in DB.
- Expose raw `providerTaskId` to public share routes without auth check.
- Delete `CreditTransaction` rows — append refund instead.

## Related

- Credits ledger rules: [credits-billing](../credits-billing/SKILL.md)
- Backend services: [backend-feature](../backend-feature/SKILL.md)
