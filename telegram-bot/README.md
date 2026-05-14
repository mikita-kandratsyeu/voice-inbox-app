# Voice Inbox — Telegram admin bot

Separate Node process. Reads allowed Telegram user ids from the **`AppConfig`** row `TELEGRAM_ADMIN_USER_IDS` (JSON array of digit strings), managed in the web admin under **Security → Telegram admin bot**.

## Setup

From this directory:

```bash
yarn install
cp .env.example .env
# fill TELEGRAM_BOT_TOKEN and DATABASE_URL
yarn dev
```

`dotenv` loads `.env` from the **current working directory** when you run `yarn dev` / `yarn start` (run commands from `telegram-bot/`, not the repo root). On production, set variables in the host environment instead; a missing `.env` file is fine.

Use a **dedicated** Postgres user for the bot (not the web superuser). Minimum privileges:

**`SELECT`** on: `"AppConfig"`, `"SupportIssue"`, `"AdminAuditLog"`, `"BroadcastHistory"`, `"ProLicenseKey"` (for overview counts).

**`UPDATE`** on `"SupportIssue"` (close / reopen tickets).

**`INSERT`** on `"AdminAuditLog"` (audit row on ticket status change, same shape as web admin).

After you change the whitelist in the web admin, the bot may serve the previous list until the in-memory cache expires (**10 minutes** by default). Restart the bot or set `TELEGRAM_WHITELIST_CACHE_SECONDS` (60–86400) in `.env` if you want a shorter or longer TTL (e.g. `3600` for one hour).

## Commands (after whitelist access)

| Command | Description |
|---------|-------------|
| `/start` | Short welcome |
| `/help` | List commands |
| `/me` | Your Telegram user id (for the web admin whitelist) |
| `/ping` | `SELECT 1` round-trip to Postgres |
| `/whitelist` | Count of ids in the cached whitelist |
| `/admin` | Full panel: overview, support queue & stats, audit log, app config, broadcasts, Pro keys |

Telegram’s command menu is set on startup (`setMyCommands`).

### `/admin` — overview and sections

- **Home / Refresh overview** — open support count, unissued Pro keys, broadcast row count, cached whitelist size.
- **Support — queue** — open tickets, paginated; open a ticket to close or reopen; writes `support.status` to **`AdminAuditLog`** with `metadata.source = telegram_bot`.
- **Support — stats** — same idea as web: open total, open created in last 7 / 30 days.
- **Audit log** — latest entries, paginated; tap a line for JSON metadata (read-only).
- **App config** — all `AppConfig` key/value rows, truncated for chat; multi-part navigation if long (read-only).
- **Broadcasts** — recent `BroadcastHistory` rows (read-only).
- **Pro keys** — recent `ProLicenseKey` rows (read-only); list shows a short **hash prefix** only, not redeemable keys. Tap a row for full metadata.

When **`WEB_ADMIN_URL`** is **`https`**, or **`WEB_ADMIN_MINI_APP_URL`** is set to an **`https`** URL, the home and Pro-keys views get a **Web admin (Mini App)** button that opens the admin UI **inside Telegram**. Plain `http` URLs (for example local dev) do not get a button unless you set **`WEB_ADMIN_MINI_APP_URL`** to a working `https` entrypoint.

Optional env **`TELEGRAM_BOT_AUDIT_LOGIN`** / **`TELEGRAM_BOT_AUDIT_ID`** (default `telegram-bot`) for rows written when changing support status from the bot.

## Scripts

- `yarn dev` — long polling (development)
- `yarn start` — same with `NODE_ENV=production`
- `yarn type:check` — TypeScript
