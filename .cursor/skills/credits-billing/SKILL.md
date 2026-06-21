---
name: credits-billing
description: Implements credits ledger, spending, refunds, and Stripe billing for AI Music. Use when changing credit costs, balance checks, checkout, webhooks, or pricing packages.
---

# Credits and Billing

## Ledger model

Credits are an **append-only ledger** (`CreditTransaction`), not a mutable balance column.

```txt
balance(userId) = SUM(credit_transactions.amount) WHERE user_id = userId
```

Types: `purchase`, `spend`, `refund`. Amount: positive = credit, negative = debit.

Implementation:

- **Ledger logic:** `packages/db/src/credits-ledger.ts` (`spendCredits`, `refundCredits`, `getCreditsBalance`)
- **API layer:** `apps/api/src/modules/credits/service.ts` — thin wrapper, maps `InsufficientCreditsLedgerError` → `InsufficientCreditsError`
- **Worker refunds:** import `refundCredits` from `@ai-music/db`, not inline Prisma writes

## Constants

Single source: `packages/shared/src/constants/index.ts`

- `FREE_DEMO_CREDITS` — on first user sync
- `GENERATION_CREDIT_COST` — full generation pipeline
- `VOICE_CONVERSION_CREDIT_COST` — standalone conversion
- `CREDIT_PACKAGES` — Stripe package ids

Change costs here only; do not duplicate magic numbers in routes.

## Spend / refund rules

1. **Spend inside DB transaction** with balance check (`spendCredits`).
2. Spend at **job start** (after validation), not on frontend click alone.
3. **Refund on failure** with explicit reason: `generation_failed:{jobId}`, `enqueue_failed:{jobId}`.
4. Never accept credit amount from client body.

Example flow: `apps/api/src/modules/generations/service.ts` — spend → create job → enqueue; refund if enqueue fails. Worker refunds on processor failure.

## Stripe (target flow)

```txt
POST /api/billing/create-checkout-session { packageId }
  → Stripe Checkout Session (server-side)
User pays
POST /api/billing/webhook (signed)
  → verify signature
  → idempotent credit grant by stripePaymentId
  → CreditTransaction type=purchase
```

Current routes return 501 — implement server-only credit grants.

## Security checklist

- [ ] Webhook signature verification (Stripe SDK)
- [ ] Idempotency: skip if `stripePaymentId` already processed
- [ ] Credits added only in webhook handler, never on success redirect URL
- [ ] `InsufficientCreditsError` → HTTP 402
- [ ] No credit balance in JWT or localStorage as source of truth

## API

- `GET /api/credits/balance` — authenticated, server-computed sum
- Frontend displays balance from API; `@ai-music/api-client` `credits` module

## Admin & QA (dev/testing)

Plan override and credit grants for admins/testers — **not implemented yet**.
Target flow: [references/admin-dev-testing.md](references/admin-dev-testing.md)
Full spec: [docs/admin-dev-testing-flow.md](../../../docs/admin-dev-testing-flow.md)

## References

- Pricing tiers and cost rationale: [references/pricing-model.md](references/pricing-model.md)
- Admin/QA dev flow: [references/admin-dev-testing.md](references/admin-dev-testing.md)
- Stripe env + local webhook setup: [docs/billing-stripe-local-setup.md](../../../docs/billing-stripe-local-setup.md)
