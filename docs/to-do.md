# PRO: идеи привилегий для аудитории 10–16 лет

Документ фиксирует согласованный список Pro-привилегий и реализацию **Karaoke Sync**.

## Итоговый список Pro

| # | Буллет на pricing | Статус |
| - | ----------------- | ------ |
| 1 | До 3 минут треков | Есть |
| 2 | Мой голос в песнях | Есть |
| 3 | Редактор куплетов и припевов | Есть (Advanced Editor) |
| 4 | Karaoke Sync — текст в такт музыке | **Реализовано** |
| 5 | Разделение вокала и музыки | Есть |
| 6 | Priority Queue | Есть |
| 7 | 50 версий истории | Есть |

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

## Smart Extend

Не в Pro. API `POST /api/music/extend` остаётся в коде, но не продаётся.

## Phase 2

- Lyrics video / mp4 export
- Remix / Cover UI
- Voice presets pack

## Ключевые файлы

- `packages/shared/src/constants/plans.ts` — `karaokeSync`
- `packages/shared/src/constants/credits-economy.ts` — `karaokeLyrics`
- `apps/api/src/modules/music/timed-lyrics.service.ts`
- `packages/ai-providers/.../suno-api.client.ts` — `getTimestampedLyrics`
- `apps/web/src/shared/ui/karaoke/` — UI
- `apps/web/src/features/billing/pricing-panel.tsx`
