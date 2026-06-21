---
name: code-review-ai-music
description: Reviews AI Music code for correctness, security, architecture, and project conventions. Use when reviewing pull requests, diffs, or when the user asks for a code review.
---

# Code Review — AI Music

Apply on every review:

- [.cursor/rules/project-rules.md](../../rules/project-rules.md)
- [.cursor/rules/frontend-architecture.mdc](../../rules/frontend-architecture.mdc)
- [.cursor/rules/backend-shared-packages.mdc](../../rules/backend-shared-packages.mdc)
- [.cursor/rules/suno-voice-persona-contract.mdc](../../rules/suno-voice-persona-contract.mdc) — если PR трогает voice/persona/music generate

## Review order

1. **Security** — auth, credits, secrets, webhooks, user scoping
2. **Architecture** — correct layer (route vs service vs provider vs worker)
3. **Correctness** — edge cases, refunds, idempotency, job states
4. **Conventions** — file size, no inline styles, rg not grep
5. **Tests** — changed logic has meaningful coverage

## Security checklist

- [ ] `requireAuth` on mutating/user data routes
- [ ] Queries filtered by `userId` from JWT, not from body
- [ ] Credits spent/refunded server-side only
- [ ] Stripe webhook signature + idempotency (when implemented)
- [ ] No `SUNO_API_KEY` / `KITS_API_KEY` in web bundle or logs
- [ ] Voice consent validated before sample storage
- [ ] File upload limits and MIME checks

## Architecture checklist

- [ ] Suno/Kits types not imported outside `packages/ai-providers`
- [ ] Long operations in worker/queue, not blocking HTTP
- [ ] DTO mappers separate vendor/DB shape from API response
- [ ] Zod schemas shared via `@ai-music/shared` when client uses same shape
- [ ] Storage via `StorageService`, keys from `@ai-music/shared` (`storage/keys.ts`)
- [ ] Credits via `packages/db/src/credits-ledger.ts`, not duplicated Prisma in worker
- [ ] ElevenLabs UI only for status/preview, not timeline/editor

## Credits checklist

- [ ] Cost from shared constants, not hardcoded in one file
- [ ] Refund path on every failure branch after spend
- [ ] `creditsCostUnits` stored on job for accurate refund amount

## Suno Voice persona checklist (если PR трогает voice / music generate)

- [ ] `sunoVoiceId` только из непустого `record-info.voiceId`, без fallback на `taskId`
- [ ] Ready/sync используют `checkPersonaVoiceAvailability`, не только `checkVoiceIdAvailability`
- [ ] `voiceId === taskId` из record-info не отфильтровывается
- [ ] Music generate: `personaModel: voice_persona`, `SUNO_VOICE_MODEL`, без `vocalGender`
- [ ] Persona resolve не продублирован вне allow-list из [suno-voice-persona-contract.mdc](../../rules/suno-voice-persona-contract.mdc)

## Frontend checklist

- [ ] No inline `style={{}}`
- [ ] No cross-feature imports of `*-classes.ts`
- [ ] `parseApiError` for API errors (no local duplicates)
- [ ] `usePollingQuery` for server polling (not raw `setInterval`, unless editor store-bound)
- [ ] API via `useApi()` / `@ai-music/api-client`
- [ ] Tailwind maps (`appShell`, `mp`, `mtk`, feature maps); `--muted` vs `--muted-bg` respected
- [ ] Entry panel < 500 lines; reusable UI in `shared/ui/`
- [ ] Loading and error states for async actions

## Feedback format

**Critical** — must fix before merge (security, data loss, broken credits)

**Suggestion** — should fix (maintainability, missing refund, weak validation)

**Nice to have** — optional (naming, minor duplication)

Include file path and concrete fix, not vague advice.

## Example findings

**Critical**: Route spends credits without transaction — race can overdraw balance.
Fix: use `spendCredits()` in `credits/service.ts`.

**Suggestion**: Suno response type imported in `routes.ts`.
Fix: map in provider, return domain DTO from service.

**Nice to have**: Hook exceeds 50 lines — extract pagination helper.

## Self-check before approving

- Would this pass with concurrent requests on same user balance?
- Does failed worker run leave user without refund?
- Can unauthenticated user access another user's songId?
