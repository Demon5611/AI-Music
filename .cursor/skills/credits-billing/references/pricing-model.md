# Pricing model reference

## Source of truth

Full economy spec: [docs/credits-economy-suno.md](../../../../docs/credits-economy-suno.md).

Ledger stores **units**, not display credits:

```txt
1 credit = 1000 units
0.4 credit = 400 units
```

Operation constants live in `packages/shared/src/constants/credits-economy.ts`.

## Credit packages

Defined in `packages/shared/src/constants/index.ts`:

<!-- | Package id | Credits | Label   |
| ---------- | ------- | ------- |
| `starter`  | 50      | Starter |
| `creator`  | 200     | Creator |
| `pro`      | 1000    | Pro     | -->

Free tier: `FREE_DEMO_CREDITS = 50` on first auth sync (`sync-auth-user.ts`).

## Operation costs

| Operation | Constant | Units | Display credits |
| --- | --- | ---: | ---: |
| Generate Text | `OPERATION_COST_UNITS.generateText` | 400 | 0.4 |
| Generate Track | `OPERATION_COST_UNITS.generateTrack` | 12000 | 12 |
| Stem Separation | `OPERATION_COST_UNITS.stemSeparation` | 10000 | 10 |
| WAV Export | `OPERATION_COST_UNITS.wavExport` | 400 | 0.4 |

Store per-job cost in `GenerationJob.creditsCostUnits` for accurate refunds.

## Editor export formats (Studio WAV)

WAV export is a **format option**, not a quality upgrade:

| Step | Format | Plan | Credits | Notes |
| --- | --- | --- | ---: | --- |
| Render version | MP3 | all | 0 | Default export after editor render |
| Export WAV | WAV (PCM 44.1 kHz) | Studio (`wavExport`) | 0.4 | Same render mix, different container for DAW / NLE import |

Implementation: ffmpeg converts the completed render MP3 to WAV. Audio content is identical to the MP3 render; WAV does not restore loss from earlier compression. Re-export of the same version is free (cached file, idempotent ledger key `wav_export:{songId}:v{n}`).

UI copy must not promise «максимальное качество» — use «дополнительный формат экспорта» / «экспорт в WAV».

## Billing principles

1. **Fixed cost per operation** in units — predictable UX on pricing page.
2. **Refund on provider/worker failure** — user should not pay for failed jobs.
3. **No partial refunds** in MVP — full `creditsCostUnits` refunded on job failure.
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
