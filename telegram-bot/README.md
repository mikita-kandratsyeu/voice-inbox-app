# Voice Inbox — Telegram admin bot

Mobile-first admin interface for the Voice Inbox web dashboard (`/admin`). English UI.

## Requirements

- Node.js ≥ 24
- Same Postgres database as `web/`
- Running web app (or deployed URL) for mutating operations via `/api/admin/*`

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | yes | Bot token from [@BotFather](https://t.me/BotFather) |
| `DATABASE_URL` | yes | Postgres connection (admin `telegramUserId` lookup) |
| `WEB_ADMIN_URL` | yes* | Site origin, e.g. `https://voice-inbox.example` |
| `TELEGRAM_BOT_API_SECRET` | yes* | Shared secret; set the same value on web as `TELEGRAM_BOT_API_SECRET` |

\*Required for API-backed actions (overview, support, keys, push, etc.). Without them the bot only shows link/setup screens.

Optional: `ADMIN_LINK_*` for Operations console URLs.

Copy `.env.example` to `.env` and fill in values.

## Auth model

1. **Per-admin Telegram id** — each `AdminUser` can have `telegramUserId` (unique). Set it in web admin → Security → Admin users (create or edit).
2. **RBAC** — the bot loads `isSuperadmin` and `permissions[]` from that admin row (same tabs as web). Menu sections are hidden without permission.
3. **API calls** — the bot calls `WEB_ADMIN_URL/api/admin/...` with `Authorization: Bearer <TELEGRAM_BOT_API_SECRET>` and `X-Telegram-User-Id: <telegram id>`. Web validates the secret and linked admin, then applies the same route permissions as the browser session.

Secrets (keys, passwords) are never shown in full; keys use masked prefixes only.

## Setup

```bash
cd telegram-bot
yarn install
cp .env.example .env
# Edit .env, run web migration for telegramUserId column
yarn dev
```

Link your Telegram account:

1. Message the bot `/whoami` and copy your numeric id.
2. In web admin → Security → Admin users, set **Telegram user id** on your admin row (or ask a superadmin).

## Commands

| Command | Description |
|---------|-------------|
| `/start`, `/menu` | Main menu (permission-filtered when linked) |
| `/help` | Command list |
| `/whoami` | Telegram id, linked login, permissions |
| `/status` | Quick overview (Postgres, Redis, Vercel, devices) |
| `/cancel` | Cancel an in-progress flow |
| `/ping` | Database latency |

## Sections (inline menu)

| Section | Permission | Features |
|---------|------------|----------|
| Overview | overview | Health, Vercel deploys, GitHub commits, push device count |
| Config | config | App config summary, link to Pro keys |
| Support | support | Ticket lists, detail, close/reopen with confirmation |
| Pro Keys | config | List, generate, view masked key metadata |
| Releases | releases | List by locale, publish/unpublish |
| Push | messaging | Broadcast types, history |
| Operations | operations | Support stats, API errors, audit log, console links |
| Budget | budget | Totals, recent expenses, quick add |
| Security | security | Access policy, admin list |
| My Account | — | Profile, reset session |

## Scripts

- `yarn dev` — long polling (development)
- `yarn start` — production
- `yarn type:check` — TypeScript
- `yarn test` — unit tests (format helpers)

## Project layout

```
src/
  auth/          admin profile from DB (telegramUserId)
  api/           HTTP client for web admin API
  modules/       overview, support, pro-keys, …
  session/       in-memory flows and list indices
  ui/            HTML formatting, keyboards, replies
  router.ts      commands & callback routing
  index.ts       entrypoint
```
