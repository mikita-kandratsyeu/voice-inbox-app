# Shared packages

Placeholder workspace for future TypeScript packages shared across apps (for example API types, AI constants, backup schema).

Apps live at the repository root (`web/`, `mobile/`, `telegram-bot/`). Add new packages here as `packages/<name>/` with their own `package.json`, then depend on them via `"@voice-inbox/<name>": "workspace:*"`.

Do **not** share Prisma (web) and Drizzle (mobile) schemas — only portable business logic and types.
