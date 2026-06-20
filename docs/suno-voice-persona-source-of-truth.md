# Suno Voice persona — источник правды

Документ фиксирует единый контракт для подмены вокала (`personaId`) и поля
`readyForMusicGeneration` в API/UI.

## ID glossary (не путать)

| Suno API | Колонка БД | Назначение |
| -------- | ---------- | ---------- |
| `task_id` | `sunoVoiceTaskId` | Задачи validate / generate; polling `validate-info`, `record-info` |
| `voice_id` | `sunoVoiceId` | Persona для music generate (`personaId` в Suno music API) |

**Запрещено:** записывать `task_id` в `sunoVoiceId`.

**Правило:** `sunoVoiceId` берётся **только** из `record-info` при `status === "success"`.

## Единый источник правды (код)

```txt
apps/api/src/modules/voice-samples/persona-voice-id.service.ts
  resolvePersonaVoiceId(sample)  →  voice_id или null
  isReadyForMusicGeneration(sample, personaVoiceId)
```

Все потребители:

| Endpoint / flow | Использование |
| --------------- | ------------- |
| `GET /api/voice-samples` | `toVoiceSampleDtoWithPersonaCheck` → `readyForMusicGeneration` |
| `GET .../suno-voice/status` | то же после sync |
| `POST /api/music/generate` | `resolveSunoVoicePersonaForUser` → `resolvePersonaVoiceId` |
| `syncSunoVoiceTaskStatus` (ready) | `check-voice(voice_id)` **до** `voiceCloneStatus: ready` |

### Критерий `readyForMusicGeneration: true`

Все условия одновременно:

1. `status === "ready"` (файл образца загружен)
2. `consentConfirmed === true`
3. `voiceCloneStatus === "ready"`
4. `resolvePersonaVoiceId()` вернул не-null (Suno `check-voice` с `{ voice_id }` → `isAvailable: true`)

**Не достаточно** только наличия строки в `sunoVoiceId` без live check.

## Flow: от записи до трека

```mermaid
flowchart TD
  A[Главная: upload sample] --> B[VoiceSample status ready]
  B --> C[/consent prepare: task_id validate]
  C --> D[awaiting_verification: фраза Suno]
  D --> E[/consent verify: task_id generate]
  E --> F[cloning: poll record-info]
  F --> G{record-info success + voice_id}
  G -->|check-voice OK| H[DB: ready + sunoVoiceId]
  G -->|check-voice fail| I[DB: failed]
  H --> J[readyForMusicGeneration true]
  J --> K[/music-create generate]
  K --> L[personaId = sunoVoiceId → Suno music V5]
```

## Что делать при ошибке generate (403 persona)

| Симптом в Network | Действие |
| ----------------- | -------- |
| `readyForMusicGeneration: false`, `voiceCloneStatus: ready` | **Только `/consent`** — «Повторить верификацию». Образец на главной **не** перезаписывать. |
| `voiceCloneStatus: failed` | `/consent` → повторить; если снова fail — новый образец на главной |
| `readyForMusicGeneration: true`, generate OK | Ничего |

### Нужно ли пересоздавать образец?

| Сценарий | Новый upload на главной | Повторная верификация /consent |
| -------- | ------------------------ | ------------------------------ |
| Был `ready`, generate 403, файл образца на месте | **Нет** | **Да** |
| Хотите другой тембр / новая запись | **Да** (заменит образец) | **Да** (автоматически после upload) |
| `voiceCloneStatus: failed` после нескольких попыток | **Да** | **Да** |
| Первичная настройка | **Да** | **Да** |

List API (`GET /api/voice-samples`) при каждом запросе:

- синхронизирует незавершённые task;
- вызывает `resolvePersonaVoiceId({ persistCorrection: true })` — может **исправить**
  `sunoVoiceId` из `record-info` без повторной записи пользователя.

## Пол голоса vs persona

| Механизм | Где | Роль |
| -------- | --- | ---- |
| `User.vocalGender` | lyrics generate, UI hints | Род глаголов в тексте |
| `personaId` (voice_id) | music generate | Подмена вокала Suno |

При `voice_persona` **`vocalGender` не отправляется** в Suno music API — persona
задаёт голос; пол остаётся для текста и UI.

## Автопочинка и диагностика

```bash
# Проверить voice_id в Suno
cd apps/api && pnpm exec tsx scripts/check-suno-voice.ts <voice_id>

# Состояние образцов пользователя
pnpm exec tsx scripts/debug-voice-persona.ts <userId>
```

## Связанные файлы

- `persona-voice-id.service.ts` — resolve + ready criteria
- `resolve-suno-voice-persona.ts` — persona для music generate
- `music-persona.ts` — `buildPersonaSongInput`, strip vocal tags
- `.cursor/skills/music-provider-integration/references/suno-voice-flow.md` — UX flow
