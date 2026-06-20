# Admin & QA dev/testing (краткая выжимка)

Полный документ: [docs/admin-dev-testing-flow.md](../../../../docs/admin-dev-testing-flow.md)

## As-is

- Нет admin role / admin API
- Plan: `Subscription.planId` + Stripe webhook или `updateSubscriptionPlan`
- Credits: ledger `grantCredits` / `spendCredits` в `@ai-music/db`
- Новый user: 30 demo credits + plan `free` в `sync-auth-user.ts`

## To-be (3 слоя)

1. **Identity** — Clerk `publicMetadata.role` + `ADMIN_EMAILS` → `requireAdmin`
2. **Plan override** — admin API → `updateSubscriptionPlan` (без Stripe ids)
3. **Credits grant** — admin API → `grantCredits` с reason `admin_*` / `qa_*`

## MVP порядок

1. CLI scripts (`admin:set-plan`, `admin:grant-credits`)
2. `apps/api/src/modules/admin/` + audit log
3. Clerk role sync
4. Web `/dev/admin` (admin-only)

## Reason codes

- `admin_plan_override:{planId}`
- `admin_credit_grant`
- `qa_grant:{sprint}`

## Security

- Prod: strict `ADMIN_EMAILS`, audit log, no client-only checks
- Override plan ≠ Stripe payment path
