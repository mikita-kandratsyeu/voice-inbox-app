# Shared packages

TypeScript packages shared across apps.

| Package | Purpose |
|---------|---------|
| `@voice-inbox/ai-job-core` | AI worker duration limits, QStash publish plan, job envelope parsing |

Apps live at the repository root (`web/`, `mobile/`, `telegram-bot/`, `workers/ai/`). Depend via `"@voice-inbox/<name>": "workspace:*"`.

Do **not** share Prisma (web) and Drizzle (mobile) schemas — only portable business logic and types.
