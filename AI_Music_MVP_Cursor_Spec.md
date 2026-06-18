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
| Music Generation | Suno API (sunoapi.org) через `@ai-music/ai-providers` |
| Music abstraction | `MusicProvider` + `MusicService` (реализовано, default `sunoapi`) |
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
| AI | Suno (music) + Kits AI (voice transfer) |
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
Generate text + music prompt
↓
Generate base song через MusicService → активный MusicProvider (Suno)
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
4. вызывает `MusicService` (не Suno HTTP напрямую);
5. polling статуса через `getGenerationStatus` / `pollMusicUntilComplete`;
6. получает base song (mp3);
7. применяет Kits AI voice conversion;
8. сохраняет результат в R2 / local storage;
9. обновляет статус job;
10. возвращает ссылку на result.

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

### music_generations

История async-генераций музыки (Suno и др. через MusicProvider). Отдельно от `generation_jobs` (полный pipeline voice + song).

```txt
id
user_id
type                    # generate | lyrics | extend
provider_task_id        # taskId от провайдера (unique)
prompt
style
title
custom_mode
instrumental
status                  # pending | processing | completed | failed
raw_status              # vendor-specific
error_message
lyrics_result           # json
created_at
updated_at
```

### music_generation_tracks

Suno возвращает 2 варианта на один запрос — каждый хранится отдельной строкой.

```txt
id
music_generation_id
provider_track_id
title
duration_sec
audio_storage_key       # local/R2 после persist
audio_source_url        # URL от провайдера до persist
image_source_url
lyrics_text
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

### Music (MusicProvider / Suno)

Тестовый и продуктовый слой генерации музыки. Реализовано в `apps/api/src/modules/music/`.
Auth обязателен на generate, lyrics, status, history, delete, audio.

```http
GET  /api/music/test/status
POST /api/music/generate
POST /api/music/lyrics
GET  /api/music/status/:taskId
POST /api/music/extend
GET  /api/music/history
POST /api/music/history/delete
GET  /api/music/tracks/:trackId/audio
DELETE /api/music/tracks/:trackId
POST /api/music/callback/suno
```

**POST /api/music/generate** body:

```json
{
  "prompt": "Веселая песня про лето",
  "style": "pop",
  "title": "Лето",
  "customMode": false,
  "instrumental": false,
  "durationSec": 60
}
```

- `customMode: false` — prompt = описание идеи (max 500 символов);
- `customMode: true` — prompt = lyrics для пения, обязательны `style` + `title`;
- `durationSec` — подсказка в prompt/style (API Suno не задаёт точную длительность);
- один запрос Suno = 2 трека в ответе.

---

### Credits / Billing

```http
GET /api/credits/balance
POST /api/billing/create-checkout-session
POST /api/billing/webhook
```

---

## 11. Структура проекта (monorepo)

Turborepo + pnpm workspaces. У каждого приложения и пакета свой `src/` — это **разные модули**, не дубликаты одного frontend.

```txt
ai-music/                          # корень monorepo
├── package.json                   # turbo scripts: dev, build, db:*
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml             # Postgres + Redis (dev)
├── .env.example                   # общие env для api/worker
│
├── apps/
│   ├── web/                       # §11.1 — Next.js :3000
│   ├── api/                       # §11.2 — Fastify REST :3001
│   ├── worker/                    # §11.3 — BullMQ consumer
│   └── mobile/                    # §11.4 — Expo placeholder
│
└── packages/                      # §11.5 — shared libraries
    ├── shared/
    ├── api-client/
    ├── ai-providers/
    ├── db/
    └── config/                    # ESLint + TS presets
```

**Зависимости между пакетами:**

```txt
@ai-music/web        → api-client, shared
@ai-music/api        → db, shared, ai-providers
@ai-music/worker     → db, shared, ai-providers
@ai-music/api-client → shared
@ai-music/ai-providers → (standalone, env через process.env)
@ai-music/db         → Prisma client
```

**Dev-команды (корень):**

```bash
pnpm dev:web      # Next.js
pnpm dev:api      # Fastify
pnpm dev:worker   # BullMQ
pnpm docker:up    # Postgres + Redis
pnpm db:push      # Prisma schema → DB
```

HTTP-клиент в web **не** дублируется — используется `@ai-music/api-client` через `shared/providers/api-provider.tsx`.

### 11.1 Фактическая структура `apps/web/src/`

```txt
apps/web/src/
  middleware.ts              # Clerk auth middleware

  app/                       # маршруты (тонкий слой → features)
    layout.tsx
    page.tsx                 # landing
    globals.css
    sign-in/[[...sign-in]]/
    sign-up/[[...sign-up]]/
    create/
    voice/
    consent/
    generation/[id]/
    track/[id]/
    share/[slug]/
    profile/
    pricing/
    music-create/            # generate song, history, player

  features/                  # UI + hooks по экранам
    landing/                 # реализовано
    music-create/            # generate song, style chips, voice picker
    voice/                   # upload + Suno voice clone
    generation/              # generation-status-panel
    profile/                 # credits placeholder UI
    music-editor/            # timeline editor
    audio-player/            # placeholder (пусто)
    billing/                 # placeholder (пусто)
    credits/                 # placeholder (пусто)
    create-track/            # placeholder scaffold (пусто)
    voice-upload/            # placeholder scaffold (пусто)
    voice-consent/           # placeholder (пусто)
    generation-progress/     # placeholder scaffold (пусто)

  entities/                  # типы / re-export из @ai-music/shared
    user/
    track/
    voice-sample/
    generation-job/

  shared/
    ui/                      # site-header, form, authenticated-audio, …
    config/                  # env.ts
    hooks/                   # use-auth-ready.ts
    providers/               # api-provider, app-providers
    lib/                     # placeholder (пусто)
```

### 11.2 `apps/api/src/` — Fastify REST API

Точка входа: `main.ts` (`buildApp`, порт `API_PORT` / 3001). Только REST — без бизнес-логики AI внутри модулей напрямую к вендорам.

```txt
apps/api/
  storage/                   # локальные файлы (dev), см. STORAGE_LOCAL_PATH
    voice-samples/
    music-generations/       # persist mp3 после Suno
  src/
    main.ts
    common/
      errors.ts              # AppError, isAppError
      load-env.ts
      require-auth.ts          # preHandler для защищённых routes
    modules/
      auth/                    # Clerk + dev-auth, plugin, sync user
      users/
      voice-samples/           # upload, list, delete, mapper
      generations/             # create job → BullMQ, status
      tracks/                  # CRUD + share slug
      music/                   # MusicService facade (§10 Music)
        routes.ts
        service.ts             # generate, lyrics, status, extend
        music-record.service.ts  # history, persist audio, delete
        music-record.mapper.ts
        handle-music-error.ts
      credits/                 # balance, service
      billing/                 # Stripe checkout + webhook (stub)
      storage/                 # local/R2 abstraction, file routes
      queue/
        generation-queue.ts    # BullMQ producer
```

Модули `elevenlabs/` — пустой scaffold (удалён), не использовать.

**Правило:** route → service → `@ai-music/db` / `@ai-music/ai-providers` / storage. Без прямых HTTP-вызовов Suno/Kits из `apps/api`.

---

### 11.3 `apps/worker/src/` — BullMQ consumer

Отдельный Node-процесс. Слушает очередь `GENERATION_QUEUE_NAME` из `@ai-music/shared`.

```txt
apps/worker/src/
  index.ts                   # bootstrap worker, SIGINT/SIGTERM
  generation.worker.ts       # BullMQ Worker + Redis connection
  common/
    load-env.ts
    local-storage.ts         # чтение voice samples / запись result (dev)
  processors/
    generate-song.ts         # orchestrator: processGenerationJob, статусы, refund
    preprocess-voice.ts      # загрузка и нормализация voice sample
    convert-voice.ts         # generateBaseSong (MusicService + poll) + Kits conversion
    upload-result.ts         # сохранение в storage, создание Track
```

Целевой pipeline (§8.2): preprocess → `MusicService` + polling → Kits → upload → `completed`.

---

### 11.4 `apps/mobile/src/` — Expo placeholder (Stage 3)

Минимальный задел под React Native / Expo Router:

```txt
apps/mobile/src/
  app/
    index.tsx                # placeholder screen
  shared/
    api/
      index.ts               # re-export @ai-music/api-client (задел)
```

Mobile не дублирует web UI — только `api-client` + `shared`.

---

### 11.5 `packages/` — shared libraries

#### `@ai-music/shared` — `packages/shared/src/`

Типы, Zod-схемы, константы для web, api, worker, mobile.

```txt
packages/shared/src/
  index.ts
  types/
    index.ts
    kits.ts
    music-generation.ts      # DTO history, tracks, status
  schemas/
    index.ts                 # Zod: prompt, upload, …
  constants/
    index.ts                 # GENERATION_QUEUE_NAME, credit costs, styles
  utils/                     # placeholder (пусто)
```

#### `@ai-music/api-client` — `packages/api-client/src/`

Fetch-обёртки для web и mobile. Единый `createApi({ baseUrl, getAuthToken })`.

```txt
packages/api-client/src/
  index.ts
  client.ts                  # createApi, тип Api
  voice-samples.ts
  generations.ts
  music.ts                   # generate, lyrics, status, history, delete
  kits.ts
  tracks.ts
  credits.ts
  billing.ts
  users.ts
```

#### `@ai-music/db` — `packages/db/`

```txt
packages/db/
  prisma/
    schema.prisma            # User, VoiceSample, Track, GenerationJob,
                             # MusicGeneration, MusicGenerationTrack,
                             # CreditTransaction
  src/
    index.ts                 # export prisma client
```

#### `@ai-music/ai-providers` — `packages/ai-providers/src/`

Provider abstraction (§19). API и worker импортируют только отсюда.

```txt
packages/ai-providers/src/
  index.ts
  types.ts                   # VoiceConversionProvider (legacy root types)
  music/
    music.service.ts         # единая точка входа для music
    music-provider.factory.ts
    music-config.ts
    poll-music.ts
    domain/
      music-provider.interface.ts
      music.types.ts
      music-status.ts
      music-provider-id.ts
      errors/                # MusicProviderError, timeout, rate limit, …
    providers/
      suno-api/              # prod default (client, mapper, provider)
      elevenlabs/            # stub
      official-suno/         # stub
      udio/                  # stub
      stub-music.provider.ts
  kits/
    kits-client.ts
    create-kits-client.ts
    poll.ts
    types.ts
    kits-api-error.ts
```

Папка `packages/ai-providers/src/elevenlabs/` — пустой scaffold (legacy), не использовать.

#### `@ai-music/config` — `packages/config/`

Shared ESLint и TypeScript presets для всех apps/packages.

```txt
packages/config/
  eslint/                    # node.mjs, …
  typescript/                # base.json, build.json
```

---

### 11.6 Правила web (`apps/web`)

- `app/*/page.tsx` — только композиция; логика в `features/*`.
- Стили — CSS modules в `features/*/styles/` или `shared/ui/*.module.css`; без inline styles.
- Fetch к API — только через `@ai-music/api-client` (контекст `useApi()`), не прямой fetch из компонентов.
- Dev-страница `/music-test` — redirect на `/music-create` (legacy URL).

### 11.7 Целевая структура features (когда MVP дозреет)

Пустые scaffold-папки (`create-track/`, `voice-upload/`, …) можно слить с рабочими (`create/`, `voice/`, …) или наполнить по мере реализации §6:

```txt
features/
  landing/
  create/                    # prompt + style
  voice/                     # recorder, upload, consent
  generation/                # progress, polling
  audio-player/              # wavesurfer.js на result
  profile/                   # credits, history, billing entry
  credits/
  billing/
```

---

## 12. Backend structure

Детальное дерево — **§11.2** (`apps/api`) и **§11.3** (`apps/worker`). Кратко:

| Слой | Путь | Роль |
|---|---|---|
| REST API | `apps/api/src/modules/*` | auth, CRUD, music facade, queue producer |
| Worker | `apps/worker/src/processors/*` | async AI pipeline |
| AI vendors | `packages/ai-providers/src/` | Suno, Kits — не в apps/api |
| DB | `packages/db/prisma/schema.prisma` | единая схема |
| Storage | `apps/api/src/modules/storage/` + `apps/api/storage/` (dev) | voice + music mp3 |

AI-провайдеры **не** живут в `apps/api` напрямую — только через `@ai-music/ai-providers`.

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

### Suno Voice: две записи (главная + `/consent`)

Пользователь проходит **два разных шага**, это требование Suno Voice API, а не дублирование:

1. **Главная** — свободный образец голоса (10–120 сек) для анализа тембра.
2. **`/consent`** — Suno выдаёт **свою** фразу; пользователь записывает её **напевом** для верификации и создания `sunoVoiceId` (persona).

После этого — `/music-create` с `personaId`.

Подробная схема, статусы, файлы кода и тексты для UI:  
`.cursor/skills/music-provider-integration/references/suno-voice-flow.md`

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

Не привязывать бизнес-логику API/worker/UI напрямую к Suno, Kits или другому вендору.
Два независимых слоя в `@ai-music/ai-providers`:

| Слой | Назначение | Env |
|---|---|---|
| **Music** | async генерация музыки и lyrics | `MUSIC_PROVIDER`, `SUNO_API_*` |
| **Voice** | voice conversion | `KITS_API_*` |

### 19.1 MusicProvider (реализовано)

Пакет: `packages/ai-providers/src/music/`

```ts
interface MusicProvider {
  readonly id: MusicProviderId;
  generateSong(input: GenerateSongInput): Promise<GenerateSongResult>;
  extendSong(input: ExtendSongInput): Promise<ExtendSongResult>;
  getLyrics(input: GetLyricsInput): Promise<GetLyricsResult>;
  getGenerationStatus(taskId: string): Promise<GenerationStatusResult>;
}
```

**Единая точка входа:** `MusicService` → `MusicProviderFactory.getProvider()`.

**Провайдеры (`MUSIC_PROVIDER`):**

| id | Статус | Описание |
|---|---|---|
| `sunoapi` | **default, prod** | sunoapi.org, async task + polling |
| `elevenlabs` | stub | задел под ElevenLabs Music |
| `official-suno` | stub | задел под официальный Suno API |
| `udio` | stub | задел под Udio |

**Vendor-agnostic статусы музыки** (отдельно от `GenerationStatus` job pipeline §8.3):

```ts
type MusicGenerationStatus = "pending" | "processing" | "completed" | "failed";
```

**Suno-специфика** изолирована в `providers/suno-api/` (client, mapper, errors, duration hints).
Бизнес-код не импортирует Suno HTTP-типы.

**Polling:** `pollMusicUntilComplete()` в `poll-music.ts` — основной путь завершения задачи.

**Env (music):**

```txt
MUSIC_PROVIDER=sunoapi
SUNO_API_KEY=
SUNO_API_BASE_URL=https://api.sunoapi.org
SUNO_API_MODEL=V4_5ALL
SUNO_CALLBACK_URL=http://localhost:3001/api/music/callback/suno
SUNO_POLL_INTERVAL_MS=5000
SUNO_POLL_TIMEOUT_MS=600000
```

**Особенности Suno (продуктовые ограничения):**

- 1 запрос = 2 варианта трека;
- non-custom prompt max 500 символов;
- custom mode: prompt = lyrics, нужны `style` + `title`;
- точная длительность не поддерживается API — только hints через `durationSec` в prompt/style;
- webhook опционален, polling — primary.

**Worker pipeline (целевой):**

```txt
MusicService.generateSong → pollMusicUntilComplete → download mp3
→ Kits voice conversion → storage → update generation_jobs
```

### 19.2 VoiceConversionProvider (Kits)

```ts
interface VoiceConversionProvider {
  convertVoice(input: ConvertVoiceInput): Promise<ConvertedVoiceResult>;
}
```

Kits — отдельный модуль `packages/ai-providers/src/kits/`, не часть `MusicProvider`.

### 19.3 API модуль music (реализовано)

`apps/api/src/modules/music/` — REST §10 Music, persistence в `music_generations` / `music_generation_tracks`, локальное/R2 хранение mp3.

UI генерации: `apps/web/src/features/music-create/` (`/music-create`).

### 19.4 Правила для нового кода

- API и worker вызывают только `MusicService`, не Suno HTTP client;
- новый music-вендор = новый класс `MusicProvider` + регистрация в factory;
- voice transfer всегда через Kits, не через `MusicProvider`;
- UI не знает о vendor-specific полях — только DTO из API.

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
- **MusicProvider layer + Suno integration** (`@ai-music/ai-providers`);
- **Music API** (`/api/music/*`) + history + persist tracks;
- integration с Kits AI (voice conversion);
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
Используй AI_Music_MVP_Cursor_Spec.md как главный продуктовый и архитектурный контекст.
Не добавляй сложный DAW editor.
Делай web-first MVP.
Соблюдай provider abstraction: MusicService / MusicProvider для музыки, Kits для voice.
API и worker не вызывают Suno HTTP напрямую — только через @ai-music/ai-providers.
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
Postgres (generation_jobs, music_generations, …)
  ↓
BullMQ / Redis
  ↓
Generation Worker
  ↓
MusicService → MusicProvider (Suno API)
  ↓
Kits AI Voice Conversion
  ↓
Cloudflare R2 / local storage
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
MusicService → Suno (MusicProvider)
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
    │   │   ├── music.ts
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
        │   ├── music/             # REST facade → MusicService
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
│   ├── web/                       # Next.js — только UI (§11)
│   │   ├── package.json           # "@ai-music/web"
│   │   ├── next.config.ts
│   │   └── src/                   # см. §11.1 — единственный frontend src
│   │       ├── middleware.ts
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx
│   │       │   ├── sign-in/, sign-up/
│   │       │   ├── create/, voice/, consent/
│   │       │   ├── generation/[id]/, track/[id]/, share/[slug]/
│   │       │   ├── profile/, pricing/
│   │       │   ├── music-create/   # /music-create (+ /music-test redirect)
│   │       ├── features/          # landing, music-create, voice, music-editor, …
│   │       ├── entities/
│   │       └── shared/
│   │           ├── ui/
│   │           ├── config/
│   │           ├── hooks/
│   │           └── providers/     # → @ai-music/api-client
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
│   │       │   ├── music/         # MusicService facade, history
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
    │       ├── music.ts           # generate, lyrics, status, history
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
    │       ├── music/
    │       │   ├── music.service.ts
    │       │   ├── music-provider.factory.ts
    │       │   ├── poll-music.ts
    │       │   ├── domain/
    │       │   └── providers/
    │       │       ├── suno-api/      # prod default
    │       │       ├── elevenlabs/    # stub
    │       │       ├── official-suno/ # stub
    │       │       └── udio/          # stub
    │       └── kits/
    │           ├── kits-client.ts
    │           └── poll.ts
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
| enum `GenerationStatus` §8.3, `MusicGenerationStatus` §19.1 | wavesurfer → expo-av / react-native-track-player |
| логика credits (read-only на клиенте) | Stripe Checkout → RevenueCat / IAP |

---

### 26.4 Миграция single-app → monorepo

Порядок без остановки продукта:

```txt
1. packages/shared     ← src/entities + Zod + constants
2. packages/db         ← prisma/schema + src/server/db
3. packages/ai-providers ← music/ (MusicProvider) + kits/ (voice)
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
