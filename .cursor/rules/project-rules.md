# Global project rules

- Use rg instead of grep/find.
- Never use inline styles (except dynamic CSS variables for third-party widgets).
- **UI styles: Tailwind only** via `appShell`, shared maps (`mp`, `mtk`), or feature maps (`lp`, `mc`, `me`, `pf`, `voiceUi`). CSS modules only for `:global()` playlist overrides.
- **No cross-feature style imports** — shared tokens in `shared/theme/` or `shared/ui/`.
- **API errors on web** — `parseApiError` from `@/shared/lib/parse-api-error`, не локальные копии.
- **Server polling on web** — `usePollingQuery`; `setInterval` только для editor store-bound poll.
- **Storage keys** — только `packages/shared/src/storage/keys.ts`.
- **Credits spend/refund** — только `packages/db/src/credits-ledger.ts` (API wrapper в `credits/service.ts`).
- Verify file paths before editing/importing.
- Keep files under 500 lines.
- Keep functions under 50 lines.
- Prefer simple solutions.
- Do not over-engineer.
- Do not expose secrets.
- Do not trust client-side payment or credit values.
- Test changed logic.

## Architecture rules (Cursor)

- [frontend-architecture.mdc](frontend-architecture.mdc) — структура features, tokens, entities, polling
- [backend-shared-packages.mdc](backend-shared-packages.mdc) — storage keys, credits ledger, Kits scope
- [elevenlabs-ui-integration.mdc](elevenlabs-ui-integration.mdc) — ElevenLabs UI только preview/status
- [suno-voice-persona-contract.mdc](suno-voice-persona-contract.mdc) — Suno Voice persona, sync, music generate (не ломать контракт)
