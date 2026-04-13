# Voice Inbox AI — Web

Web landing page for **Voice Inbox AI** — an offline-first voice notes app with AI transcription and summarization.

---

## About

The site showcases Voice Inbox AI: explains features, walks through the workflow, and directs users to download the mobile app from the App Store and Google Play.

---

## Features

- **Internationalization (i18n)** — English and Russian (`next-intl`)
- **Light & dark theme** — toggle via `next-themes`
- **Responsive layout** — Tailwind CSS v4
- **SEO & Open Graph** — metadata, canonical URLs, dynamic OG images
- **Pages** — home, Privacy Policy, Terms of Service (Markdown in `content/` — Yandex ads when not on paid ad-free tier, subject to policy updates)
- **API** — AI/sync/message endpoints (Redis or in-memory), mobile JWT auth, **in-app support** (`POST /api/support` → Postgres)
- **Admin** — dashboard at `/admin` (bonus config, infra status incl. Postgres ping, push with preview/history, support inbox with search & CSV export, **release notes** for the landing blog, audit log, API error histogram via Redis, admin users & access policy)
- **Blog** — `/blog` and `/blog/[slug]` (localized); content from Postgres, edited in admin (**Blog** tab)

---

## Tech Stack


| Category  | Technology              |
| --------- | ----------------------- |
| Framework | Next.js 16 (App Router) |
| Language  | TypeScript              |
| Styling   | Tailwind CSS v4         |
| i18n      | next-intl               |
| Theme     | next-themes             |
| Icons     | lucide-react            |
| Analytics | @vercel/analytics       |


---

## Environment Variables


| Variable                   | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_URL`     | Base URL of the site                                                 |
| `OPENROUTER_API_KEY`       | OpenRouter API key (for AI services)                                 |
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis URL                                                    |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token                                                  |
| `APP_SECRET`               | Secret used only to obtain JWT from `POST /api/token`                |
| `JWT_SECRET`               | Secret to sign API JWTs (min 32 chars); required for API auth        |
| `JWT_EXPIRES_IN`           | Optional mobile API JWT expiry (e.g. `1h`, `12h`, `24h`; default `12h`) |
| `DATABASE_URL`             | Neon Postgres — admin users, `AppConfig`, **support issues** (required for `/admin` and `POST /api/support`) |
| `ADMIN_JWT_SECRET`         | Signs admin session JWT (min 32 chars); falls back to `JWT_SECRET`  |
| `ADMIN_SEED_*`             | See `.env.example` — seed first admin via `yarn db:seed`             |
| `VERCEL_TOKEN`             | Vercel API token for deployment status on admin dashboard (optional) |
| `VERCEL_PROJECT_ID`        | Vercel project ID to filter deployments (optional)                   |
| `NEXT_PUBLIC_FIREBASE_CONSOLE_PROJECT_ID` | Optional; enables direct admin links to Firebase Crashlytics, Cloud Messaging & Remote Config |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`         | Optional; GA4 on the landing; admin shows link when set                |


Without Redis, an in-memory store is used (suitable for development).

---

## Localization

- **Languages:** `en` (default), `ru`
- **URLs:** `/` — English, `/ru` — Russian
- **Translation files:** `messages/en.json`, `messages/ru.json`

