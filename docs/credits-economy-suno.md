# Credits Economy: SunoAPI MVP

## Unit model

Ledger stores integer **credit units**, not display credits.

```txt
1 display credit = 1000 units
0.4 credit = 400 units
12 credits = 12000 units
```

Database source: `credit_transactions.amount_units`.
Idempotent spend/refund uses nullable unique `credit_transactions.idempotency_key`.

UI and public API show display credits: `amount_units / 1000`.

## Operation costs

Source of truth: `packages/shared/src/constants/credits-economy.ts`.

| Operation | Suno credits | Units |
| --- | ---: | ---: |
| Generate Text | 0.4 | 400 |
| Generate Track | 12 | 12000 |
| Stem Separation | 10 | 10000 |
| WAV Export | 0.4 | 400 |
| Full Production Flow | 27.4 | 27400 |

`Render version` in the editor is not Suno WAV Export. It is local ffmpeg MP3 rendering and is
free in the MVP.

## SunoAPI wholesale pricing

| Package | Price | Credits | Cost per credit |
| --- | ---: | ---: | ---: |
| Small | $5 | 1000 | $0.005 |
| Medium | $50 | 10000 | $0.005 |
| Large | $500 | 105000 | ~$0.00476 |
| XL | $1250 | 275000 | ~$0.00455 |

MVP margin math uses the conservative Small package price: `$0.005 / credit`.

## Plans

| Plan | Price | Display credits | Grant units | Full flows | Suno COGS | Gross margin |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Free | $0 | 50 | 50000 | ~1.8 | $0.25 | - |
| Pro | $19 | 500 | 500000 | ~18.24, display 18 | $2.50 | ~$16.50 |
| Studio | $49 | 2000 | 2000000 | ~73, display 73 | $10.00 | ~$39.00 |

Project limits (`maxProjects`): Free 3, Pro 10, Studio 100. WAV export: Studio only (not yet implemented).

## Spend and refund rules

- Spend only on the server; never accept cost from request body.
- Spend units before calling Suno if the operation can fail due to insufficient balance.
- Store task ownership before allowing status polling to affect refunds.
- Refund provider failure or content moderation failure with an idempotency key.
- Keep render/editor-local operations free in MVP unless they call Suno API.

## Editor billing map

| Editor operation | Billing |
| --- | --- |
| First stem separation on editor open | `OPERATION_COST_UNITS.stemSeparation` |
| Stem separation retry | no double charge; refund failure once |
| Split, move, fade, undo, redo | free, entitlement-only |
| Render version MP3 | free local ffmpeg operation — default export format |
| WAV Export (Studio) | `OPERATION_COST_UNITS.wavExport`; same mix as render MP3, exported as WAV for DAW import; not a quality tier; cached re-download free per version |

## Agent checklist

When adding a Suno operation:

1. Add or reuse a key in `OPERATION_COST_UNITS`.
2. Spend units in the API service before provider usage.
3. Add idempotent refund for provider failure.
4. Expose UI cost using `formatCreditsFromUnits`.
5. Update this document and `credits-billing` skill notes.
