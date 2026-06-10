# Voice Inbox — Telegram admin bot

Mobile-first admin interface for the Voice Inbox web dashboard (`/admin`). English UI.

Repository overview: [../README.md](../README.md). Web admin setup: [../web/README.md](../web/README.md).

## Requirements

- Node.js ≥ 24
- Same Postgres database as `web/` (`DATABASE_URL`)
- Running or deployed web app for mutating operations via `/api/admin/*`

## Environment variables

| Variable                  | Required | Description                                                                                                                                                   |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`      | yes      | Bot token from [@BotFather](https://t.me/BotFather)                                                                                                           |
| `DATABASE_URL`            | yes      | Postgres (`AdminUser.telegramUserId` lookup)                                                                                                                  |
| `WEB_ADMIN_URL`           | yes\*    | Site origin, e.g. `https://voice-inbox.example`                                                                                                               |
| `TELEGRAM_BOT_API_SECRET` | yes\*    | Shared secret — same as web `TELEGRAM_BOT_API_SECRET`                                                                                                         |
| `TELEGRAM_BOT_USER_AGENT` | no       | Product token in `User-Agent` (default `VoiceInbox-Bot`). Vercel Firewall: bypass when User-Agent **contains** this string (like mobile `MOBILE_USER_AGENT`). |

\*Required for API-backed actions (overview, support, keys, push, etc.). Without them the bot shows link/setup screens only.

Optional: `ADMIN_LINK_*` for Operations console URLs.

```bash
cd telegram-bot
cp .env.example .env
# Edit .env
```

## Auth model

1. **Per-admin Telegram id** — each `AdminUser` can have `telegramUserId` (unique). Set in web admin → Security → Admin users.
2. **RBAC** — bot loads `isSuperadmin` and `permissions[]` from that row (same tabs as web).
3. **API calls** — `WEB_ADMIN_URL/api/admin/...` with `Authorization: Bearer <TELEGRAM_BOT_API_SECRET>` and `X-Telegram-User-Id: <id>`. Web validates secret + linked admin, then applies route permissions.

Secrets (keys, passwords) are never shown in full; API keys use masked prefixes only.

## Setup

Install dependencies from the **repository root** (`yarn install` — see [../README.md](../README.md#monorepo-setup)).

```bash
cp telegram-bot/.env.example telegram-bot/.env
# Configure .env; ensure web schema is applied (yarn workspace voice-inbox-web db:push)
yarn dev:telegram-bot
```

Link your Telegram account:

1. Message the bot `/whoami` and copy your numeric id.
2. In web admin → Security → Admin users, set **Telegram user id** on your admin row (superadmin required).

## Commands

| Command           | Description                                       |
| ----------------- | ------------------------------------------------- |
| `/start`, `/menu` | Main menu (permission-filtered when linked)       |
| `/help`           | Command list                                      |
| `/whoami`         | Telegram id, linked login, permissions            |
| `/status`         | Quick overview (Postgres, Redis, Vercel, devices) |
| `/cancel`         | Cancel an in-progress flow                        |
| `/ping`           | Database latency                                  |

## Sections (inline menu)

| Section    | Permission | Features                                                  |
| ---------- | ---------- | --------------------------------------------------------- |
| Overview   | overview   | Health, Vercel deploys, GitHub commits, push device count |
| Config     | config     | App config summary, link to Pro keys                      |
| Support    | support    | Ticket lists, detail, close/reopen with confirmation      |
| Pro Keys   | config     | List, generate, view masked key metadata                  |
| Releases   | releases   | List by locale, publish/unpublish                         |
| Push       | messaging  | Broadcast types, history                                  |
| Operations | operations | Support stats, API errors, audit log, console links       |
| Budget     | budget     | Totals, recent expenses, quick add                        |
| Security   | security   | Access policy, admin list                                 |
| My Account | —          | Profile, reset session                                    |

## Scripts

Run from repo root with `yarn workspace voice-inbox-telegram-bot <script>`, or `cd telegram-bot` and use `yarn <script>`.

| Script            | Description                 |
| ----------------- | --------------------------- |
| `dev`             | Long polling (`yarn dev:telegram-bot` from root) |
| `start`           | Production                  |
| `type:check`      | TypeScript                  |
| `test`            | Unit tests (format helpers) |

Monorepo quality gates: `yarn turbo run lint type:check test --filter=voice-inbox-telegram-bot`.

## Project layout

```
src/
  auth/          Admin profile from DB (telegramUserId)
  api/           HTTP client for web admin API
  modules/       overview, support, pro-keys, …
  session/       In-memory flows and list indices
  ui/            HTML formatting, keyboards, replies
  router.ts      Commands & callback routing
  index.ts       Entrypoint
```
