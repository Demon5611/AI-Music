# PRO: идеи привилегий и Phase 2 roadmap

Документ фиксирует согласованный список Pro-привилегий, статус entitlements и план Studio-фич.

## Итоговый список Pro

| # | Буллет на pricing | Статус |
| - | ----------------- | ------ |
| 1 | До 3 минут треков | Есть |
| 2 | Мой голос в песнях | Есть |
| 3 | Редактор куплетов и припевов | Есть (Advanced Editor) |
| 4 | Karaoke Sync — текст в такт музыке | **Реализовано** |
| 5 | Разделение вокала и музыки | Есть |
| 6 | Priority Queue | Есть |
| 7 | 50 операций undo/redo | Есть (enforcement в API) |
| 8 | История 10 проектов | Есть (`maxProjects: 10`) |
| 9 | Генерация обложки | Есть |

## Entitlements — лимиты проектов (реализовано)

| План | maxProjects | undo/redo ops | wavExport |
| ---- | ----------- | ------------- | --------- |
| Free | 3 | выкл | выкл |
| Pro | 10 | 50 | выкл |
| Studio | 100 | безлимит | вкл (endpoint — Phase 2) |

Единый `maxProjects` для `/history` (take) и создания `Song` в редакторе.

## Karaoke Sync — поведение

- Toggle **«Караоке: вкл/выкл»** (состояние в `localStorage`, ключ `karaoke-enabled`)
- **Pro gate** на первый fetch; Free видит disabled toggle + ссылку на `/pricing`
- **Один Suno-запрос на trackId**: `POST /api/music/tracks/:id/timed-lyrics` только при cache miss
- Повторные открытия экранов — только `GET`, без credits и без Suno
- Стоимость: `OPERATION_COST_UNITS.karaokeLyrics` = 0.5 credits (ledger spend/refund)

### Где доступно

- Music Create (результаты генерации)
- History
- Editor (панель + render preview), sync с timeline `currentTimeMs`

---

## Roadmap Phase 2+ (Studio)

### PR 1 — Закрыть дыру extend (сделано / в работе)

- Feature flag `aiRemix` в `plans.ts` — только Studio
- `POST /api/music/extend` → `assertFeature(userId, "aiRemix")`
- Endpoint **не продаётся** до Remix UI; после Remix UI — **удалить** `/extend` или оставить internal-only
- **Важно:** pricing «AI Remix» — это **не** extend. Extend = удлинить трек. Remix = Suno `upload-cover` + `referenceAudioUrl`

### PR 2 — WAV export (Studio) — реализовано

- Дополнительный **формат экспорта** (не улучшение качества): render MP3 → WAV через ffmpeg
- `POST /api/music/:songId/export-wav`, `GET .../versions/:versionId/wav`
- `assertFeature("wavExport")`, 0.4 credit; повтор той же версии бесплатен
- UI: «Экспорт в WAV» в editor Render panel

### PR 3 — AI Remix UI (Studio)

- Новый `POST /api/music/tracks/:id/remix` (не переиспользовать сырой `/extend`)
- Provider: `uploadAndCover` через `referenceAudioUrl` (уже в `suno-api.provider.ts`)
- UI: выбор стиля (Pop, Rock, …) на карточке трека / history
- Billing: ~`generateTrack` (12 credits), spend/refund, queue priority studio
- После релиза: **удалить** публичный `POST /api/music/extend`

### PR 4 — Voice presets (Studio)

- Статический конфиг пресетов в `packages/shared` (soft, energetic, …)
- Feature `voicePresets` — studio only
- **Не смешивать** с Suno voice persona (`sunoVoiceId`); пресет = style tags + `vocalGender`, без custom voice
- UI: выбор в music-create — свой голос **или** пресет
- Billing: обычная стоимость generate

### PR 5 — Lyrics video / MP4 (Studio)

См. раздел **Lyrics video — сценарий MVP** ниже.

---

## Lyrics video — сценарий MVP

**Не AI-генерация видео по промпту.** Шаблонный рендер: аудио + синхронный текст + обложка.

### Сценарий пользователя

1. Пользователь Studio открывает готовый трек (history / editor / create results).
2. У трека есть текст; для таймкодов нужен Karaoke Sync (Pro+). Если кэша нет — предложить получить караоке (0.5 credit) или auto-fetch при экспорте.
3. Пользователь выбирает **шаблон** (не свободный промпт):
   - формат: 9:16 (TikTok / Shorts / Reels)
   - визуал: обложка трека + тёмный градиент (1–2 пресета на MVP)
4. Нажимает «Экспорт видео» → API создаёт job → worker ffmpeg → MP4 в storage → download.

### Что задаёт пользователь (MVP)

| Параметр | MVP | v2 (опционально) |
| -------- | --- | ---------------- |
| Промпт сцены | Нет | Нет (не video-gen AI) |
| Шаблон оформления | Да (выбор из 2–3) | Больше шаблонов |
| Цвет акцента / шрифт | Нет | Да |
| Текст | Из трека + timed lyrics | То же |
| Аудио | Оригинал или render из editor | То же |

### Технический pipeline

```txt
track audio (storage) + timedLyricsJson + album cover image
  → worker: ffmpeg 1080x1920, drawtext/ASS по таймкодам
  → songs/{userId}/{trackId}/videos/v{n}.mp4
```

- Feature: `lyricsVideoExport` (studio only)
- Cost: новая константа в `credits-economy.ts` (TBD, ~1–2 credits)
- Зависимость: timed lyrics (караоке); Pro нужен для первого fetch, Studio — для экспорта MP4

### Почему не промпт

Генерация видео через text-to-video (Sora и т.п.) — другой продукт, другие costs, модерация. MVP — **lyrics karaoke video** для соцсетей, предсказуемый результат за секунды ffmpeg.

---

## Ключевые файлы

- `packages/shared/src/constants/plans.ts` — entitlements, `aiRemix`, `lyricsVideoExport`, `voicePresets`
- `packages/shared/src/constants/credits-economy.ts`
- `packages/shared/src/entitlements/index.ts`
- `apps/api/src/modules/music/routes.ts` — extend gate, будущий remix
- `apps/api/src/modules/music/timed-lyrics.service.ts`
- `apps/api/src/modules/music-editor/render.service.ts` — MP3 render (бесплатно)
- `packages/ai-providers/.../suno-api.provider.ts` — upload-cover для Remix
- `apps/web/src/shared/ui/karaoke/` — UI караоке (переиспользовать логику строк)
- `apps/web/src/features/billing/pricing-panel.tsx`
