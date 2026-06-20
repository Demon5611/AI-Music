# Pricing model reference

## Credit packages

Defined in `packages/shared/src/constants/index.ts`:

<!-- | Package id | Credits | Label   |
| ---------- | ------- | ------- |
| `starter`  | 50      | Starter |
| `creator`  | 200     | Creator |
| `pro`      | 1000    | Pro     | -->

Free tier: `FREE_DEMO_CREDITS = 30` on first auth sync (`sync-auth-user.ts`).

## Operation costs

| Operation                                            | Constant                       | Default |
| ---------------------------------------------------- | ------------------------------ | ------- |
| Full generation (voice + song + conversion + upload) | `GENERATION_CREDIT_COST`       | 10      |
| Suno music generate (`/api/music/generate`)          | `GENERATION_CREDIT_COST`       | 10      |
| Voice conversion only                                | `VOICE_CONVERSION_CREDIT_COST` | 5       |
| Suno voice prepare (онбординг)                      | `VOICE_CLONE_PREPARE_CREDIT_COST` | 0 (бесплатно) |
| Suno voice verify (онбординг)                      | `VOICE_CLONE_VERIFY_CREDIT_COST`  | 0 (бесплатно) |

Store per-job cost in `GenerationJob.creditsCost` for accurate refunds.

## Billing principles

1. **Fixed cost per operation** — predictable UX on pricing page.
2. **Refund on provider/worker failure** — user should not pay for failed jobs.
3. **No partial refunds** in MVP — full `creditsCost` refunded on job failure.
4. **Reserve at start** — spend credits when job is accepted, not when completed.

## Stripe mapping (planned)

```txt
packageId → CREDIT_PACKAGES[packageId].credits
stripePaymentId → stored on CreditTransaction
reason → "purchase:{packageId}" or "stripe:{sessionId}"
```

## Future considerations (not MVP)

- Different costs per music provider or duration tier.
- Subscription vs one-time packs.
- Credit expiration — not in current schema; would need new transaction type + policy.

When adding variable pricing, still use ledger entries; never update a `users.credits_balance` column.
