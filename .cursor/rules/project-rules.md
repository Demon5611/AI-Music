# Global project rules

- Use rg instead of grep/find.
- Never use inline styles (except dynamic CSS variables for third-party widgets).
- **UI styles: Tailwind only** via `appShell` / feature class maps (`lp`, `mt`, `me`). CSS modules only for `:global()` playlist overrides.
- Verify file paths before editing/importing.
- Keep files under 500 lines.
- Keep functions under 50 lines.
- Prefer simple solutions.
- Do not over-engineer.
- Do not expose secrets.
- Do not trust client-side payment or credit values.
- Test changed logic.
