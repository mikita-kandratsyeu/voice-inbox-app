# Voice Inbox AI — Web

Next.js site and backend for **Voice Inbox AI**: marketing pages, legal docs, mobile API, admin dashboard, and optional Telegram bot integration.

Repository overview: [../README.md](../README.md).

---

## Getting started

Install dependencies from the **repository root** (`yarn install` — see [../README.md](../README.md#monorepo-setup)).

```bash
cp web/.env.example web/.env
```

1. Set **`DATABASE_URL`** and **`DIRECT_URL`** (Supabase Postgres; see `.env.example` for pooler URLs). Use the **`postgres`** pooler user — Prisma bypasses RLS; `anon` / `authenticated` do not.
2. Set **`JWT_SECRET`** (min 32 characters) and **`FIREBASE_SERVICE_ACCOUNT`** (FCM + App Check on `POST /api/token`).
3. Apply schema:
   - **New empty DB:** `yarn db:push` (quick dev) or `yarn db:migrate` (tracked migrations).
   - **Existing Supabase DB** that was created with `db:push` and shows **P3005** on `yarn db:migrate`: baseline once, then deploy pending SQL:
     ```bash
     cd web
     yarn db:baseline-and-migrate   # marks older migrations as applied, runs the rest
     yarn db:verify-rls
     ```
     Dry run: `yarn db:baseline -- --dry-run`. Mark only through a specific migration: `yarn db:baseline -- --through 20260610120000_in_app_event_page --then-deploy`.
4. On Supabase, harden Data API once: `yarn db:rls`, then `yarn db:verify-rls` (RLS + revoke for `anon`/`authenticated` only; does not affect Prisma). Use **`DIRECT_URL`** (session pooler, port 5432) for migrate/baseline — not the transaction pooler (6543).
5. Seed the first superadmin (empty `AdminUser` table only):

   ```bash
   ADMIN_SEED_LOGIN=admin ADMIN_SEED_PASSWORD='your-secure-password' yarn db:seed
   ```

6. Run dev server: `yarn dev:web` (from repo root) or `yarn workspace voice-inbox-web dev` → open `/admin` to sign in.

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

## Scripts

Run from repo root with `yarn workspace voice-inbox-web <script>`, or `cd web` and use `yarn <script>`.

| Script | Description |
| ------ | ----------- |
| `dev` | Next.js dev server (`yarn dev:web` from root) |
| `build` | `prisma generate` + production build |
| `start` | Production server |
| `lint` / `lint:fix` | ESLint |
| `type:check` | Prisma generate + `tsc` |
| `db:generate` | Prisma client only |
| `db:push` | Push schema to database (dev) |
| `db:migrate` | Apply pending Prisma migrations (`migrate deploy`) |
| `db:baseline` | Mark existing migrations as applied (fix P3005 after `db:push`) |
| `db:baseline-and-migrate` | Baseline + `migrate deploy` (typical one-time Supabase fix) |
| `db:check-local` | **Local only:** `migrate deploy` + Supabase RLS verify (`db:verify-rls`) |
| `db:rls` | Re-apply RLS hardening SQL (Supabase; run after migrations) |
| `db:verify-rls` | Assert RLS is on and Prisma (`postgres` role) can still read |
| `db:seed` | Create first superadmin (`ADMIN_SEED_*`) |
| `db:backup` / `db:restore` | `pg_dump` / restore helpers (requires `libpq`) |
| `release-post:draft` | Draft blog release post from git + `package.json` version |

Monorepo quality gates: `yarn turbo run lint type:check test --filter=voice-inbox-web`.

**Vercel (monorepo):** Root Directory `web`, Install Command `cd .. && yarn install --immutable`, Build Command `yarn build` (or from repo root: `yarn turbo run build --filter=voice-inbox-web`).

---

## Environment variables

See **`.env.example`** for the full list and comments. Core groups:

| Group | Variables |
| ----- | ----------- |
| **Site** | `NEXT_PUBLIC_BASE_URL`, store URLs, waitlist, support email |
| **Mobile API** | `JWT_SECRET`, `JWT_EXPIRES_IN`, `MOBILE_USER_AGENT`, `FIREBASE_SERVICE_ACCOUNT` |
| **AI** | `OPENROUTER_API_KEY`, optional `DEEPSEEK_*`, `AI_JOB_TRANSPORT`, QStash (`QSTASH_*`) |
| **Cache / jobs** | `UPSTASH_REDIS_REST_*` (optional — in-memory fallback) |
| **Database** | `DATABASE_URL`, `ADMIN_JWT_SECRET`, `ADMIN_SEED_*` |
| **Email** | `MAIL_FROM`, `SMTP_*` (Pro license / support replies from admin) |
| **Integrations** | `VERCEL_*`, `GITHUB_*`, `FIREBASE_SERVICE_ACCOUNT`, RevenueCat webhook keys |
| **Telegram bot** | `TELEGRAM_BOT_API_SECRET` (shared with `telegram-bot/`) |

---

## Async AI jobs

Mobile POST endpoints enqueue work in Redis (`msg:*`) and return immediately; the app polls GET until `done`.

- **Transport:** With `QSTASH_TOKEN`, work runs via **QStash**. Primary worker: **Cloud Run** when `AI_JOB_WORKER_URL` is set (900s); fallback: Vercel `POST /api/internal/ai/worker` (300s) via QStash `failureCallback` and publish-fail path. Without `AI_JOB_WORKER_URL`, QStash targets Vercel only. Without `QSTASH_TOKEN`, jobs use Next.js **`after()`** (`AI_JOB_TRANSPORT=after`).
- Set **`NEXT_PUBLIC_BASE_URL`** to a public HTTPS origin (fallback worker URL and QStash callbacks).
- Processing responses include **`pollDeadlineMs`** so mobile can poll up to 15 minutes (summary jobs: up to 30 minutes with async meeting dialogue).
- On Vercel, if Deployment Protection blocks webhooks, allow QStash or exclude `/api/internal/ai/worker`.
- **Cloud Run deploy (manual):** [packages/ai-worker/README.md](../packages/ai-worker/README.md) — GitHub Actions workflow *Deploy AI worker* (`workflow_dispatch` only).

**OpenRouter recovery:** Streaming stores `X-Generation-Id` in Redis (`or-gen:{jobId}`). If the worker times out while OpenRouter still completes, QStash retries can resume via `GET /api/v1/generation/content` instead of duplicating the chat request.

**Meeting speaker breakdown (Pro meetings):**

1. **Summarize** completes first (`status: done`, summary/tasks in Redis `msg:*`).
2. **Dialogue pass** — For long transcripts (~10k+ chars), a separate QStash job (`meeting_dialogue`, own worker budget up to 900s on Cloud Run) writes `meetingDialogueMarkdown`; mobile polls while `meetingDialogueStatus` is `processing`. Shorter meetings may run an inline second pass inside the summarize worker.
3. **Regenerate dialogue only** — `POST /api/messages/[id]/meeting-dialogue` (`web/services/message.service.ts` → `retryMeetingDialogue`). Re-dispatches `meeting_dialogue` without re-running summarize; counts against AI rate limits. Body may include `phase1` when the original Redis entry expired but the device still has title/summary/key phrases.
4. **Cancel** — Existing job cancel clears in-flight work; `web/lib/ai-job-cancel.ts` also clears stale cancel flags when starting a new dialogue attempt for the same `jobId`.

Mobile stores `cloudAiJobId` on the record for retries; custom speaker display names stay on device (`meetingSpeakerLabels`), not in Postgres.

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
