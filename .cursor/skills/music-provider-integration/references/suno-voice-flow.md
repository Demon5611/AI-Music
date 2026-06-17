# Suno Voice — flow создания голоса пользователя

Документ для разработчиков и UX: почему на главной и на `/consent` нужны **две разные записи**, и как это связано с API Suno.

## Кратко для пользователя

1. **Главная** — записать или загрузить **свободный образец** голоса (речь или пение, 10–120 сек).
2. **`/consent`** — Suno анализирует образец и выдаёт **свою фразу**; пользователь записывает **именно её**, лучше **напевом**.
3. **`/music-create`** — генерация песни с `personaId` (голос готов).

Вторая запись — **не повторное создание голоса**, а обязательная **верификация** по контракту Suno Voice API.

## Схема flow

```txt
Главная (VoiceUploadPanel)
  → POST /api/voice-samples (файл + consent)
  → redirect /consent?id={sampleId}

/consent (SunoVoiceVerifyPanel)
  → POST .../suno-voice/prepare
       → upload в Suno temp (file-stream-upload)
       → POST /api/v1/voice/validate (исходный voiceUrl)
       → poll validate-info → sunoValidatePhrase
  → пользователь записывает фразу Suno
  → POST .../suno-voice/verify
       → POST /api/v1/voice/generate (verifyUrl)
       → poll record-info → sunoVoiceId (persona)
  → redirect /music-create

/music-create
  → POST /api/music/generate с personaId + model V5 + voiceSampleId (опционально)
```

```mermaid
flowchart TD
  A[Главная: свободная запись 10–120 сек] --> B[VoiceSample в storage]
  B --> C[/consent: prepare Suno Voice]
  C --> D[Suno: validate-info → фраза]
  D --> E[/consent: запись фразы напевом]
  E --> F[Suno: generate → sunoVoiceId]
  F --> G[/music-create: выбор образца + генерация с persona]
```

## Две записи — зачем

| Этап | UI | Что записывает пользователь | Зачем |
|------|-----|----------------------------|--------|
| 1 | Главная (`VoiceUploadPanel`) | Свой текст, подсказка в tooltip (~15 сек) | **Исходный сэмпл** — тембр, манера, интонации для анализа Suno |
| 2 | `/consent` (`SunoVoiceVerifyPanel`) | **Фразу от Suno** (например: «Пение звенит в сердце…») | **Верификация владельца голоса** + лучшее качество persona при напеве |

Причины со стороны Suno:

1. **Верификация** — подтверждение, что голос в сэмпле и голос на верификации принадлежат одному человеку.
2. **Качество** — для `voice_persona` рекомендуется пение; свободная речь на шаге 1 + напев фразы на шаге 2 дают лучший результат.
3. **API** — без цепочки `validate` → `generate` persona (`sunoVoiceId`) не создаётся.

Объединить оба шага в одну запись **нельзя** без отказа от Suno Voice.

## Статусы `voiceCloneStatus` (БД / API)

| Статус | Значение для UI |
|--------|-----------------|
| `pending` | Сэмпл загружен, Suno task ещё не создан |
| `preparing` | Suno анализирует голос, ждём `sunoValidatePhrase` |
| `awaiting_verification` | Фраза готова — показать текст и кнопку записи |
| `cloning` | Отправлена верификационная запись, ждём `sunoVoiceId` |
| `ready` | `sunoVoiceId` есть — можно на `/music-create` |
| `failed` | Ошибка в `voiceCloneError` |

Таймаут клонирования считается от `voiceCloneStartedAt`, **не** от `createdAt` сэмпла.

## Ключевые файлы

| Область | Путь |
|---------|------|
| Загрузка на главной | `apps/web/src/features/voice/voice-upload-panel.tsx` |
| Верификация Suno | `apps/web/src/features/voice/suno-voice-verify-panel.tsx` |
| Выбор образца на create | `apps/web/src/features/music-create/voice-sample-picker.tsx` |
| Подсказки записи | `apps/web/src/features/voice/voice-recording-tips.ts` |
| API prepare/verify/sync | `apps/api/src/modules/voice-samples/suno-voice.service.ts` |
| Suno Voice client | `packages/ai-providers/src/suno-voice/` |
| Генерация с persona | `apps/api/src/modules/music/service.ts` |

## Env

```txt
SUNO_API_KEY=
SUNO_API_BASE_URL=https://api.sunoapi.org
SUNO_FILE_UPLOAD_BASE_URL=https://sunoapiorg.redpandaai.co
SUNO_VOICE_MODEL=V5          # voice_persona только V5 / V5_5
SUNO_VOICE_LANGUAGE=ru       # язык validation phrase
SUNO_CALLBACK_URL=...        # обязателен в запросах; основной путь — polling
```

## Рекомендуемые тексты в UI

**Главная** (под формой или в hint):

> Запишите образец голоса напевом (~15 сек). На следующем шаге Suno попросит повторить короткую фразу **тем же голосом** — это нужно для верификации и создания вашего AI-голоса.

**`/consent`** (уже есть):

> Запишите фразу тем же голосом и манерой, что при записи на главной

## Частые ошибки (разработка)

- Вызывать `/voice/regenerate`, когда статус уже `wait_validating` с готовой фразой — Suno вернёт 400.
- Считать таймаут от `createdAt` загрузки файла — ложный `failed` через 10 мин.
- Не синхронизировать статус `failed`, если Suno уже отдал `validateInfo`.
- Генерировать музыку без `personaId` / не на модели V5 — вокал не будет голосом пользователя.
- Ожидать callback на `localhost` — polling обязателен в dev.

## Связанные документы

- [sunoapi.md](sunoapi.md) — генерация музыки через Suno API
- [kits-ai.md](kits-ai.md) — Kits только для editor (separation, voice transfer на stems)

Официальная документация Suno Voice:

- https://docs.sunoapi.org/suno-api/suno-voice-validate
- https://docs.sunoapi.org/suno-api/suno-voice-validate-info
- https://docs.sunoapi.org/suno-api/suno-voice-generate
