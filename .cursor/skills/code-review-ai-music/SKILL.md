---
name: code-review-ai-music
description: Reviews AI Music code for correctness, security, architecture, and project conventions. Use when reviewing pull requests, diffs, or when the user asks for a code review.
---

# Code Review — AI Music

Apply [.cursor/rules/project-rules.md](../../rules/project-rules.md) and architecture skills on every review.

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
- [ ] Storage via `StorageService`, keys via `build*Key`
- [ ] ElevenLabs UI only for status/preview, not timeline/editor

## Credits checklist

- [ ] Cost from shared constants, not hardcoded in one file
- [ ] Refund path on every failure branch after spend
- [ ] `creditsCost` stored on job for accurate refund amount

## Frontend checklist

- [ ] No inline `style={{}}`
- [ ] API via `useApi()` / `@ai-music/api-client`
- [ ] CSS modules or Tailwind; `--muted` vs `--muted-bg` respected
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
