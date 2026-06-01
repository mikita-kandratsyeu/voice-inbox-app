# Voice Inbox AI — Web

Next.js site and backend for **Voice Inbox AI**: marketing pages, legal docs, mobile API, admin dashboard, and optional Telegram bot integration.

Repository overview: [../README.md](../README.md).

---

## Getting started

```bash
cd web
yarn install
cp .env.example .env
```

1. Set **`DATABASE_URL`** (Neon Postgres recommended; see comment in `.env.example` for `uselibpqcompat`).
2. Set **`JWT_SECRET`** and **`APP_SECRET`** (min 32 characters for JWT).
3. Apply schema: `yarn db:push` (or `prisma migrate deploy` in production).
4. Seed the first superadmin (empty `AdminUser` table only):

   ```bash
   ADMIN_SEED_LOGIN=admin ADMIN_SEED_PASSWORD='your-secure-password' yarn db:seed
   ```

5. Run dev server: `yarn dev` → open `/admin` to sign in.

Without Redis (`UPSTASH_*`), the API uses an in-memory job store — fine for local development.

---

## Features

- **Internationalization (i18n)** — English and Russian (`next-intl`)
- **Light & dark theme** — `next-themes`
- **Responsive layout** — Tailwind CSS v4
- **SEO & Open Graph** — metadata, canonical URLs, dynamic OG images
- **Pages** — home, Privacy Policy, Terms of Service (Markdown in `content/`)
- **API** — AI/sync/message endpoints, mobile JWT auth, in-app support (`POST /api/support` → Postgres)
- **Admin** — `/admin`: bonus config, infra status (Postgres ping), push + email support replies, support inbox (search & CSV), release notes with git-based draft, audit log, API error histogram (Redis), admin users & access policy
- **Blog** — `/blog`, `/blog/[slug]`, RSS `/blog/feed.xml`; Postgres content, **Blog** tab in admin
- **Backup viewer** — `/viewer` with search, deep links (`?note=`), client-side ZIP parsing

---

## Tech stack

| Category | Technology |
| -------- | ---------- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| i18n | next-intl |
| Theme | next-themes |
| Database | Prisma 7 + Postgres (`@prisma/adapter-pg`) |
| Icons | lucide-react |
| Analytics | @vercel/analytics |

**Prisma client** is generated to `web/generated/prisma` (gitignored). After schema changes: `yarn db:generate` (also runs on `yarn build` / `yarn type:check`).

---

## Scripts (from `web/`)

| Script | Description |
| ------ | ----------- |
| `yarn dev` | Next.js dev server |
| `yarn build` | `prisma generate` + production build |
| `yarn start` | Production server |
| `yarn lint` / `yarn lint:fix` | ESLint |
| `yarn type:check` | Prisma generate + `tsc` |
| `yarn db:generate` | Prisma client only |
| `yarn db:push` | Push schema to database (dev) |
| `yarn db:seed` | Create first superadmin (`ADMIN_SEED_*`) |
| `yarn db:backup` / `yarn db:restore` | `pg_dump` / restore helpers (requires `libpq`) |
| `yarn release-post:draft` | Draft blog release post from git + `package.json` version |

---

## Environment variables

See **`.env.example`** for the full list and comments. Core groups:

| Group | Variables |
| ----- | ----------- |
| **Site** | `NEXT_PUBLIC_BASE_URL`, store URLs, waitlist, support email |
| **Mobile API** | `APP_SECRET`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `MOBILE_USER_AGENT` |
| **AI** | `OPENROUTER_API_KEY`, optional `DEEPSEEK_*`, `AI_JOB_TRANSPORT`, QStash (`QSTASH_*`) |
| **Cache / jobs** | `UPSTASH_REDIS_REST_*` (optional — in-memory fallback) |
| **Database** | `DATABASE_URL`, `ADMIN_JWT_SECRET`, `ADMIN_SEED_*` |
| **Email** | `MAIL_FROM`, `SMTP_*` (Pro license / support replies from admin) |
| **Integrations** | `VERCEL_*`, `GITHUB_*`, `FIREBASE_SERVICE_ACCOUNT`, RevenueCat webhook keys |
| **Telegram bot** | `TELEGRAM_BOT_API_SECRET` (shared with `telegram-bot/`) |

---

## Async AI jobs

Mobile POST endpoints enqueue work in Redis (`msg:*`) and return immediately; the app polls GET until `done`.

- **Transport:** With `QSTASH_TOKEN`, work runs via **QStash** → `POST /api/internal/ai/worker`. Otherwise Next.js **`after()`** on the same deployment (`AI_JOB_TRANSPORT=after`).
- Set **`NEXT_PUBLIC_BASE_URL`** to a public HTTPS origin so QStash can reach the worker.
- On Vercel, if Deployment Protection blocks webhooks, allow QStash or exclude `/api/internal/ai/worker`.

**OpenRouter recovery:** Streaming stores `X-Generation-Id` in Redis (`or-gen:{jobId}`). If the worker times out while OpenRouter still completes, QStash retries can resume via `GET /api/v1/generation/content` instead of duplicating the chat request.

**Meeting speaker breakdown:** Summarize completes first (`status: done`). For long Pro meeting notes (~10k+ chars), a second QStash job (`meeting_dialogue`, 300s) fills `meetingDialogueMarkdown`; the app polls while `meetingDialogueStatus` is `processing`. Shorter meetings may use an inline second pass in the summarize worker.

---

## Localization

- **Languages:** `en` (default), `ru`
- **URLs:** `/` — English, `/ru` — Russian
- **Messages:** `messages/en.json`, `messages/ru.json`
- **Legal:** `content/privacy.*.md`, `content/terms.*.md` — see [content/README.md](content/README.md)

---

## Project layout

```
app/           App Router pages and API routes
components/    Shared UI
config/        Constants (rate limits, TTLs)
content/       Legal Markdown
lib/           Auth, Prisma helpers, admin, AI utilities
messages/      next-intl JSON
prisma/        Schema and migrations
scripts/       db-seed, backup, release-post draft
server/        Route handlers (some API logic)
services/      AI, translate, ask, etc.
generated/     Prisma client (generated, gitignored)
```
