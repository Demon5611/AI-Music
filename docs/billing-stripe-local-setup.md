# Stripe billing — local test mode

Режим A: **test keys + `stripe listen`** для локальной разработки тарифов и credits.

## Где какие ключи

| Переменная | Файл | Кто читает | Назначение |
| ---------- | ---- | ---------- | ---------- |
| `STRIPE_SECRET_KEY` | [`.env`](../.env) (корень) | `apps/api` | Checkout Sessions, Billing Portal, webhook verify |
| `STRIPE_WEBHOOK_SECRET` | `.env` | `apps/api` | Подпись webhook (`whsec_...`) |
| `STRIPE_PRICE_STARTER` | `.env` | `apps/api` | Price ID тарифа Starter ($9/мес) |
| `STRIPE_PRICE_PRO` | `.env` | `apps/api` | Price ID тарифа Pro ($19/мес) |
| `STRIPE_PRICE_CREATOR` | `.env` | `apps/api` | Price ID тарифа Creator ($39/мес) |
| `WEB_ORIGIN` | `.env` | `apps/api` | `success_url` / `cancel_url` Checkout |
| `CLERK_SECRET_KEY` | `.env` | `apps/api` | Auth для `/api/billing/*` |
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | Next.js | Запросы к billing API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `apps/web/.env.local` | Next.js | Clerk UI + токен для API |

**На фронте Stripe-ключей нет** — оплата через redirect на Stripe Checkout (URL от API).

Код маппинга price → plan: [`billing.service.ts`](../apps/api/src/modules/billing/billing.service.ts).

## Flow тарифного доступа

```txt
GET /api/billing/subscription
  → Subscription.planId + resolveEntitlements(PLANS)
  → gating в music / editor / generations

POST /api/billing/create-checkout-session { planId }
  → Stripe Checkout (subscription)

Webhook POST /api/billing/webhook
  checkout.session.completed → updateSubscriptionPlan
  invoice.paid               → grantCredits (monthlyCredits)
  customer.subscription.*    → sync plan / cancel → free
```

Entitlements (лимиты, editor, duration) — в [`packages/shared/src/constants/plans.ts`](../packages/shared/src/constants/plans.ts), не в env.

## Быстрый старт (local)

### 1. Products / Prices в Stripe

Из корня репозитория:

```bash
pnpm --filter @ai-music/api setup-stripe-billing
```

Скрипт создаёт (или находит) продукты с metadata `app=ai-music`, `planId=starter|pro|creator` и прописывает `STRIPE_PRICE_*` в `.env`.

### 2. Webhook secret

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3001/api/billing/webhook
```

Скопируйте `whsec_...` в `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

Перезапустите API.

### 3. Web (Clerk)

```bash
cp apps/web/.env.example apps/web/.env.local
# заполните NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (пара к CLERK_SECRET_KEY)
```

### 4. Проверка

1. `pnpm dev:api` + `pnpm dev:web`
2. Открыть `/pricing`, выбрать план → Stripe Checkout (test card `4242...`)
3. После оплаты webhook обновит `subscriptions.plan_id` и начислит credits
4. Обновить страницу — «Текущий план» и entitlements

## Stripe MCP в Cursor

MCP (`plugin-stripe-stripe`) авторизуется через OAuth в Dashboard. **Price ID из MCP и `STRIPE_SECRET_KEY` в `.env` должны быть из одного Stripe-аккаунта**, иначе checkout/webhook не сойдутся.

Для проекта source of truth — **`STRIPE_SECRET_KEY` в `.env`** + скрипт `setup-stripe-billing`.

## Dev без Stripe

```bash
pnpm --filter @ai-music/api set-dev-plan user@example.com pro
pnpm --filter @ai-music/api grant-dev-credits user@example.com 100
```

См. [admin-dev-testing-flow.md](./admin-dev-testing-flow.md).
