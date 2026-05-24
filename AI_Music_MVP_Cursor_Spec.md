# AI Music MVP — инструкция для разработки в Cursor

## 1. Цель MVP

Создать WEB-приложение для простого создания AI-треков с использованием голоса пользователя.

Основной пользовательский сценарий:

```txt
WEB APP
↓
Prompt → AI Song
↓
Voice transfer
↓
Share link / video
↓
Credits system
↓
Stripe
```

MVP должен позволять пользователю:

- ввести тему песни или промт;
- выбрать музыкальный стиль;
- записать или загрузить образец своего голоса;
- подтвердить согласие на использование своего голоса;
- сгенерировать песню;
- применить voice transfer;
- прослушать результат;
- скачать или поделиться ссылкой;
- покупать кредиты через Stripe.

---

## 2. Зафиксированный продуктовый выбор

Для MVP выбираем:

| Блок | Решение |
|---|---|
| Тип продукта | Web App first |
| Stage 1 | WEB MVP |
| Stage 2 | PWA |
| Stage 3 | Mobile App |
| Voice AI | Kits AI / Voice Conversion |
| Music Generation | ElevenLabs / Eleven Music |
| Payments | Stripe |
| Monetization | Credits system |
| Storage | Cloudflare R2 |
| Deploy | Vercel + Railway / Fly.io |

---

## 3. Почему сначала WEB MVP

Web-first подход выбран, потому что:

- быстрее проверить спрос;
- дешевле разработка;
- проще менять AI-провайдеров;
- проще тестировать prompt pipeline;
- нет App Store / Google Play review;
- проще подключить Stripe;
- легче дебажить audio upload / generation pipeline;
- проще делать share-ссылки на готовые треки.

Mobile app имеет смысл делать только после проверки:

- retention;
- unit-экономики;
- стоимости генерации;
- платежной модели;
- стабильности AI pipeline.

---

## 4. Этапы продукта

### Stage 1 — WEB MVP

Цель: проверить, хотят ли пользователи создавать треки своим голосом и готовы ли платить.

Функции:

- landing page;
- регистрация / логин;
- создание трека по prompt;
- выбор музыкального стиля;
- загрузка / запись voice sample;
- согласие на использование голоса;
- генерация AI song;
- voice transfer;
- result page;
- share link;
- download;
- credits;
- Stripe payment.

---

### Stage 2 — PWA

Добавить:

- installable app;
- mobile-first UX;
- push notifications;
- сохранение истории;
- быстрый доступ к последним трекам;
- улучшенный player.

---

### Stage 3 — Mobile App

Только после проверки MVP.

Возможный стек:

- React Native / Expo;
- shared API backend;
- RevenueCat для in-app purchases;
- push notifications;
- mobile recorder;
- native sharing.

---

## 5. Технологический стек

| Layer | Stack |
|---|---|
| Frontend | Next.js + Tailwind |
| Audio UI | wavesurfer.js |
| Backend | NestJS или Fastify |
| Queue | BullMQ |
| Storage | Cloudflare R2 |
| DB | Postgres |
| Auth | Clerk или Auth.js |
| Payments | Stripe |
| AI | ElevenLabs + Kits AI |
| Deploy | Vercel + Railway / Fly.io |

---

## 6. Минимальный UI

| Экран | Что внутри |
|---|---|
| Landing | demo songs, CTA, pricing |
| Create | prompt + style selector |
| Voice upload | запись / загрузка голоса |
| Consent | подтверждение прав на голос |
| Generation screen | progress, status, waiting UX |
| Result | play / share / download |
| Profile | credits / history / billing |

---

## 7. Рекомендуемый продуктовый flow

```txt
User voice sample
↓
Voice consent + verification
↓
Clean vocal / normalize
↓
Generate lyrics + music prompt
↓
Generate base song через Eleven Music
↓
Extract / replace vocal через Kits AI или voice conversion
↓
Optional edit: regenerate section / style / duration
↓
Store result in Cloudflare R2
↓
Export / share
```

---

## 8. Детальный backend flow

### 8.1 Create generation job

Frontend отправляет:

```json
{
  "prompt": "Веселая песня про лето и друзей",
  "style": "pop",
  "voiceSampleId": "voice_sample_id",
  "duration": 60
}
```

Backend:

1. проверяет авторизацию;
2. проверяет credits;
3. создает запись `generation_jobs`;
4. списывает или резервирует credits;
5. кладет job в BullMQ;
6. возвращает `jobId`.

---

### 8.2 Queue worker

Worker выполняет:

1. получает voice sample;
2. чистит / нормализует audio;
3. генерирует lyrics / music prompt;
4. вызывает music generation API;
5. получает base song;
6. применяет Kits AI voice conversion;
7. сохраняет результат в R2;
8. обновляет статус job;
9. возвращает ссылку на result.

---

### 8.3 Generation statuses

Использовать enum:

```ts
type GenerationStatus =
  | "pending"
  | "preprocessing_voice"
  | "generating_lyrics"
  | "generating_song"
  | "converting_voice"
  | "uploading_result"
  | "completed"
  | "failed";
```

---

## 9. Основные сущности БД

### users

```txt
id
email
name
created_at
updated_at
```

### voice_samples

```txt
id
user_id
r2_key
duration_sec
status
consent_confirmed
created_at
```

### tracks

```txt
id
user_id
title
prompt
style
duration_sec
audio_r2_key
cover_r2_key
share_slug
created_at
```

### generation_jobs

```txt
id
user_id
voice_sample_id
track_id
status
error_message
provider_job_id
credits_cost
created_at
updated_at
```

### credit_transactions

```txt
id
user_id
type
amount
reason
stripe_payment_id
created_at
```

---

## 10. API endpoints

### Auth

Auth можно вынести на Clerk/Auth.js.

---

### Voice

```http
POST /api/voice-samples
GET /api/voice-samples
DELETE /api/voice-samples/:id
```

---

### Generation

```http
POST /api/generations
GET /api/generations/:id
GET /api/generations/:id/status
```

---

### Tracks

```http
GET /api/tracks
GET /api/tracks/:id
GET /api/share/:shareSlug
DELETE /api/tracks/:id
```

---

### Credits / Billing

```http
GET /api/credits/balance
POST /api/billing/create-checkout-session
POST /api/billing/webhook
```

---

## 11. Frontend structure

Пример структуры Next.js app:

```txt
src/
  app/
    page.tsx
    create/
      page.tsx
    voice/
      page.tsx
    generation/[id]/
      page.tsx
    track/[id]/
      page.tsx
    share/[slug]/
      page.tsx
    profile/
      page.tsx
    pricing/
      page.tsx

  features/
    create-track/
    voice-upload/
    generation-progress/
    audio-player/
    credits/
    billing/

  entities/
    user/
    track/
    voice-sample/
    generation-job/

  shared/
    api/
    ui/
    lib/
    config/
```

---

## 12. Backend structure

```txt
src/
  modules/
    auth/
    users/
    voice-samples/
    generations/
    tracks/
    credits/
    billing/
    storage/
    ai/
      elevenlabs/
      kits/
    queue/

  workers/
    generation.worker.ts

  common/
    errors/
    logger/
    config/
```

---

## 13. Минимальное редактирование в MVP

Не делать полноценный DAW editor.

Разрешить только простые действия:

| Функция | Реализация |
|---|---|
| Изменить стиль | новая генерация |
| Изменить текст | новая генерация |
| Изменить длительность | новая генерация |
| Улучшить вокал | повторный voice conversion |
| Скачать mp3 | download из R2 |
| Поделиться | public share link |

Не делать в MVP:

- timeline editor;
- stem mixer;
- realtime editor;
- multi-track DAW;
- ручной pitch correction;
- marketplace.

---

## 14. Credits system

### Базовая логика

- 1 генерация = фиксированное количество credits;
- voice conversion может стоить отдельно;
- failed generation возвращает credits;
- credits списываются после успешного старта job или резервируются до результата.

### Пример тарифов

```txt
Free: 3 demo credits
Starter: 50 credits
Creator: 200 credits
Pro: 1000 credits
```

---

## 15. Stripe flow

```txt
User clicks buy credits
↓
Backend creates Stripe Checkout Session
↓
User pays
↓
Stripe webhook confirms payment
↓
Backend adds credits
↓
User can generate tracks
```

Обязательно:

- проверять webhook signature;
- не начислять credits на frontend callback;
- хранить Stripe payment id;
- делать idempotency.

---

## 16. Storage flow

Использовать Cloudflare R2.

Хранить:

```txt
voice-samples/{userId}/{sampleId}.wav
base-songs/{userId}/{jobId}.mp3
final-tracks/{userId}/{trackId}.mp3
covers/{trackId}.jpg
```

Для публичного доступа:

- либо signed URLs;
- либо public CDN only для share-треков.

---

## 17. Voice consent и безопасность

Перед записью голоса пользователь должен подтвердить:

- это его голос;
- он дает согласие на обработку;
- он не загружает голос другого человека;
- он не пытается имитировать публичную персону;
- результат может быть удален по запросу.

Рекомендуется добавить контрольную фразу:

```txt
Я подтверждаю, что использую свой голос для создания музыкального трека.
```

---

## 18. Риски MVP

| Риск | Как снизить |
|---|---|
| Дорогая генерация | credits, limits, queue |
| Abuse voice cloning | consent, moderation, запрет celebrity prompts |
| Долгое ожидание | progress screen, async jobs |
| Нестабильность AI API | provider abstraction layer |
| Store review risk | сначала web, потом mobile |
| Copyright claims | запрет “как Drake / Weeknd / Баста” |
| Плохое качество voice sample | подсказки, noise check, min duration |

---

## 19. Provider abstraction

Не привязывать бизнес-логику напрямую к ElevenLabs или Kits.

Сделать интерфейсы:

```ts
interface MusicGenerationProvider {
  generateSong(input: GenerateSongInput): Promise<GeneratedSongResult>;
}

interface VoiceConversionProvider {
  convertVoice(input: ConvertVoiceInput): Promise<ConvertedVoiceResult>;
}
```

Это позволит заменить провайдера без переписывания продукта.

---

## 20. MVP backlog

### Sprint 1 — Foundation

- создать Next.js project;
- настроить Tailwind;
- подключить Auth;
- создать Postgres schema;
- подключить Prisma/Drizzle;
- настроить R2;
- сделать landing;
- сделать базовый layout.

---

### Sprint 2 — Voice upload

- запись голоса в браузере;
- upload audio;
- хранение в R2;
- voice sample entity;
- consent screen;
- basic validation.

---

### Sprint 3 — Generation pipeline

- create generation job;
- BullMQ;
- worker;
- statuses;
- integration с ElevenLabs;
- integration с Kits AI;
- result page.

---

### Sprint 4 — Credits + Stripe

- credit balance;
- checkout session;
- Stripe webhook;
- credit transactions;
- billing page;
- generation cost logic.

---

### Sprint 5 — Share + polish

- public share page;
- download;
- player;
- history;
- error states;
- loading states;
- analytics.

---

## 21. Что считать успешным MVP

Минимальные метрики:

| Метрика | Цель |
|---|---|
| Time to first track | до 3–5 минут |
| Trial-to-generation | > 30% |
| Share rate | > 10% |
| Paid conversion | > 2–5% |
| Cost per generated track | ниже цены credits |
| Failed jobs | < 5–10% |

---

## 22. Рекомендации для Cursor

При разработке в Cursor держать этот документ как основной контекст.

Лучшие команды для AI-агента:

```txt
Используй AI_MUSIC_MVP_SPEC.md как главный продуктовый и архитектурный контекст.
Не добавляй сложный DAW editor.
Делай web-first MVP.
Соблюдай provider abstraction для ElevenLabs и Kits AI.
Все долгие AI операции выполняй через queue worker.
Credits списывай только через backend.
Stripe credits начисляй только через webhook.
```

---

## 23. Первое техническое решение

Два допустимых варианта. Детальные деревья папок — в **§26**.

| Критерий | Single-app | Monorepo |
|---|---|---|
| Time to first deploy | 1–2 недели | 2–3 недели |
| Mobile позже (Expo) | миграция ~1–2 спринта | подключение `apps/mobile` |
| Worker / queue | отдельный процесс в том же repo | `apps/worker` |
| Shared types для mobile | выделить вручную при миграции | `packages/shared` с day 1 |
| Команда 1 dev | **рекомендуется** | избыточно на старте |
| Mobile в горизонте ≤6 мес. | single-app + API-first | **рекомендуется** |

**Рекомендация для этого проекта:** monorepo, если mobile и отдельный API планируются в первые 6 месяцев; иначе single-app с жёстким API-first (§26.3) и миграцией по §26.4.

Корень репозитория может называться `AI-Music`, но в `package.json` имя пакета — только lowercase: `"name": "ai-music"`.

---

## 24. MVP architecture diagram

```txt
Browser
  ↓
Next.js Web App
  ↓
Backend API
  ↓
Postgres
  ↓
BullMQ / Redis
  ↓
Generation Worker
  ↓
ElevenLabs Music API
  ↓
Kits AI Voice Conversion
  ↓
Cloudflare R2
  ↓
Result / Share Link
```

---

## 25. Итоговое решение

Фиксируем MVP:

```txt
WEB APP first
↓
Next.js + Tailwind
↓
Prompt + Style + Voice Upload
↓
ElevenLabs Music Generation
↓
Kits AI Voice Transfer
↓
Cloudflare R2 Storage
↓
Credits System
↓
Stripe Payments
↓
PWA
↓
Mobile App later
```

Главный принцип:

> Не строить сложную музыкальную студию. MVP должен быстро давать пользователю wow-результат: “это песня моим голосом”.

---

## 26. Структура папок: monorepo vs single-app

### 26.1 Single-app (быстрый старт)

Один Next.js-проект + отдельный worker-процесс. Backend-логика живёт в `src/server/`, а не в React-компонентах — это упрощает перенос в monorepo и подключение mobile.

```txt
ai-music/                          # папка на диске может быть AI-Music
├── package.json                   # "name": "ai-music"
├── pnpm-lock.yaml
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local
├── prisma/                        # или drizzle/ — одна схема БД
│   └── schema.prisma
│
├── worker/                        # отдельный Node-процесс (BullMQ)
│   ├── package.json               # "name": "@ai-music/worker"
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               # bootstrap worker
│       ├── generation.worker.ts
│       └── processors/
│           ├── preprocess-voice.ts
│           ├── generate-song.ts
│           └── convert-voice.ts
│
└── src/
    ├── app/                       # только маршруты и layout (тонкий слой)
    │   ├── layout.tsx
    │   ├── page.tsx               # landing
    │   ├── (auth)/
    │   │   ├── sign-in/
    │   │   └── sign-up/
    │   ├── create/
    │   │   └── page.tsx
    │   ├── voice/
    │   │   └── page.tsx
    │   ├── consent/
    │   │   └── page.tsx
    │   ├── generation/
    │   │   └── [id]/
    │   │       └── page.tsx
    │   ├── track/
    │   │   └── [id]/
    │   │       └── page.tsx
    │   ├── share/
    │   │   └── [slug]/
    │   │       └── page.tsx
    │   ├── profile/
    │   │   └── page.tsx
    │   ├── pricing/
    │   │   └── page.tsx
    │   └── api/                   # REST — единый контракт для web и mobile
    │       ├── voice-samples/
    │       │   ├── route.ts       # POST, GET
    │       │   └── [id]/
    │       │       └── route.ts   # DELETE
    │       ├── generations/
    │       │   ├── route.ts
    │       │   └── [id]/
    │       │       ├── route.ts
    │       │       └── status/
    │       │           └── route.ts
    │       ├── tracks/
    │       │   ├── route.ts
    │       │   └── [id]/
    │       │       └── route.ts
    │       ├── share/
    │       │   └── [slug]/
    │       │       └── route.ts
    │       ├── credits/
    │       │   └── balance/
    │       │       └── route.ts
    │       └── billing/
    │           ├── create-checkout-session/
    │           │   └── route.ts
    │           └── webhook/
    │               └── route.ts
    │
    ├── features/                  # UI + hooks по экранам (§6, §11)
    │   ├── landing/
    │   │   ├── components/
    │   │   ├── landing-page.tsx
    │   │   └── styles/
    │   ├── create-track/
    │   │   ├── components/
    │   │   ├── hooks/
    │   │   └── styles/
    │   ├── voice-upload/
    │   │   ├── components/        # recorder, uploader, waveform
    │   │   ├── hooks/             # use-audio-recorder.ts
    │   │   └── styles/
    │   ├── voice-consent/
    │   ├── generation-progress/
    │   ├── audio-player/          # wavesurfer.js
    │   ├── credits/
    │   └── billing/
    │
    ├── entities/                  # типы + маппинг DTO ↔ UI (без fetch)
    │   ├── user/
    │   ├── track/
    │   ├── voice-sample/
    │   └── generation-job/
    │
    ├── shared/
    │   ├── api/                   # HTTP-клиент (fetch) — переносится в mobile as-is
    │   │   ├── client.ts
    │   │   ├── voice-samples.ts
    │   │   ├── generations.ts
    │   │   ├── tracks.ts
    │   │   └── billing.ts
    │   ├── ui/                    # Button, Modal, Spinner…
    │   ├── lib/
    │   └── config/
    │
    └── server/                    # вся бизнес-логика backend (не в route handlers)
        ├── modules/
        │   ├── auth/
        │   ├── users/
        │   ├── voice-samples/
        │   ├── generations/
        │   ├── tracks/
        │   ├── credits/
        │   ├── billing/
        │   ├── storage/           # R2
        │   ├── ai/
        │   │   ├── music-generation.provider.ts
        │   │   ├── voice-conversion.provider.ts
        │   │   ├── elevenlabs/
        │   │   └── kits/
        │   └── queue/             # BullMQ producer
        ├── db/
        │   └── index.ts
        └── common/
            ├── errors/
            ├── logger/
            └── config/
```

**Правила single-app:**

- `app/api/*` — только parse request → вызов `server/modules/*` → response.
- Server Actions — только для web-форм; дублировать контракт REST не обязательно, но REST обязателен для mobile.
- `worker/` импортирует логику из `src/server/` (общий tsconfig paths или symlink `@/server`).
- Стили — в `features/*/styles/` или CSS modules; без inline styles.

---

### 26.2 Monorepo (web + API + worker + задел под mobile)

Turborepo + pnpm workspaces. Mobile-пакет можно добавить пустым placeholder на Stage 3.

```txt
ai-music/
├── package.json                   # private monorepo root
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
│
├── apps/
│   ├── web/                       # Next.js (UI + опционально BFF)
│   │   ├── package.json           # "@ai-music/web"
│   │   ├── next.config.ts
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx
│   │       │   ├── create/
│   │       │   ├── voice/
│   │       │   ├── consent/
│   │       │   ├── generation/[id]/
│   │       │   ├── track/[id]/
│   │       │   ├── share/[slug]/
│   │       │   ├── profile/
│   │       │   └── pricing/
│   │       ├── features/          # только UI + hooks (как §26.1)
│   │       ├── entities/
│   │       └── shared/
│   │           └── ui/
│   │
│   ├── api/                       # NestJS или Fastify (§5, §12)
│   │   ├── package.json           # "@ai-music/api"
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts      # NestJS; для Fastify — app.ts + plugins
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── users/
│   │       │   ├── voice-samples/
│   │       │   ├── generations/
│   │       │   ├── tracks/
│   │       │   ├── credits/
│   │       │   ├── billing/
│   │       │   └── storage/
│   │       └── common/
│   │
│   ├── worker/                    # BullMQ consumer
│   │   ├── package.json           # "@ai-music/worker"
│   │   └── src/
│   │       ├── index.ts
│   │       ├── generation.worker.ts
│   │       └── processors/
│   │
│   └── mobile/                    # Stage 3 — Expo (placeholder)
│       ├── package.json           # "@ai-music/mobile"
│       ├── app.json
│       └── src/
│           ├── app/               # expo-router
│           │   ├── (tabs)/
│           │   ├── create/
│           │   ├── voice/
│           │   ├── generation/[id]/
│           │   └── track/[id]/
│           ├── features/          # RN UI (не копировать из web)
│           └── shared/
│               └── api/           # re-export из @ai-music/api-client
│
└── packages/
    ├── shared/                    # переносимо web ↔ mobile ↔ api ↔ worker
    │   ├── package.json           # "@ai-music/shared"
    │   └── src/
    │       ├── types/
    │       │   ├── generation-status.ts
    │       │   ├── voice-sample.ts
    │       │   ├── track.ts
    │       │   └── credits.ts
    │       ├── schemas/           # Zod: prompt, upload, billing
    │       ├── constants/
    │       │   ├── music-styles.ts
    │       │   └── credit-costs.ts
    │       └── utils/
    │
    ├── api-client/                # fetch-обёртки для web и mobile
    │   ├── package.json           # "@ai-music/api-client"
    │   └── src/
    │       ├── client.ts
    │       ├── voice-samples.ts
    │       ├── generations.ts
    │       ├── tracks.ts
    │       └── billing.ts
    │
    ├── db/                        # Prisma или Drizzle
    │   ├── package.json           # "@ai-music/db"
    │   ├── prisma/
    │   │   └── schema.prisma
    │   └── src/
    │       └── index.ts
    │
    ├── ai-providers/              # provider abstraction (§19)
    │   ├── package.json           # "@ai-music/ai-providers"
    │   └── src/
    │       ├── music-generation.provider.ts
    │       ├── voice-conversion.provider.ts
    │       ├── elevenlabs/
    │       └── kits/
    │
    └── config/                    # shared ESLint, TS, Tailwind presets
        ├── eslint/
        ├── typescript/
        └── tailwind/
```

**pnpm-workspace.yaml:**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Зависимости между пакетами:**

```txt
@ai-music/web        → @ai-music/api-client, @ai-music/shared
@ai-music/mobile     → @ai-music/api-client, @ai-music/shared
@ai-music/api        → @ai-music/db, @ai-music/shared, @ai-music/ai-providers
@ai-music/worker     → @ai-music/db, @ai-music/shared, @ai-music/ai-providers
@ai-music/api-client → @ai-music/shared
```

**Где живёт REST (§10):** только `apps/api`. Web ходит на `NEXT_PUBLIC_API_URL`, mobile — на тот же URL.

---

### 26.3 API-first: что общее для обоих вариантов

Независимо от single vs monorepo, mobile забирает:

| Переносится в Expo | Не переносится (переписывается) |
|---|---|
| `@ai-music/shared` / `entities/` + Zod | `features/*/components` (Tailwind → RN) |
| `@ai-music/api-client` / `shared/api/` | `app/` routes Next.js |
| контракты REST §10 | Server Actions, если нет REST-дублера |
| enum `GenerationStatus` §8.3 | wavesurfer → expo-av / react-native-track-player |
| логика credits (read-only на клиенте) | Stripe Checkout → RevenueCat / IAP |

---

### 26.4 Миграция single-app → monorepo

Порядок без остановки продукта:

```txt
1. packages/shared     ← src/entities + Zod + constants
2. packages/db         ← prisma/schema + src/server/db
3. packages/ai-providers ← src/server/modules/ai
4. apps/api            ← src/server/modules + app/api routes
5. apps/worker         ← worker/
6. apps/web            ← src/app + features (убрать server/)
7. packages/api-client ← src/shared/api
8. apps/mobile         ← новый Expo, только api-client + shared
```

На шаге 4 web временно проксирует `/api/*` на `apps/api` или переключается на `NEXT_PUBLIC_API_URL`.

---

### 26.5 Команды bootstrap

**Single-app** (из корня, имя пакета lowercase):

```bash
pnpm create next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-pnpm
# затем вручную: worker/, src/server/, структура features/
```

**Monorepo:**

```bash
pnpm dlx create-turbo@latest ai-music --package-manager pnpm
# затем: заменить apps/docs на apps/web, добавить apps/api, apps/worker, packages/*
```

Или вручную: корневой `package.json` + `pnpm-workspace.yaml` + `create next-app` в `apps/web`.
