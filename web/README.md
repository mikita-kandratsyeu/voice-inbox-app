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
- **Pages** — home, Privacy Policy, Terms of Service
- **API** — message endpoints (optional, Redis or in-memory)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| i18n | next-intl |
| Theme | next-themes |
| Icons | lucide-react |
| Analytics | @vercel/analytics |

---

## Project Structure

```
web/
├── app/
│   ├── [locale]/           # Localized pages
│   │   ├── page.tsx        # Home (landing)
│   │   ├── privacy/        # Privacy Policy
│   │   ├── terms/          # Terms of Service
│   │   └── layout.tsx
│   ├── api/                # API routes
│   └── layout.tsx
├── components/
│   ├── landing/            # Landing sections
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Benefits.tsx
│   │   ├── CTASection.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── StoreButtons.tsx
│   └── ui/                 # UI components
│       ├── ThemeToggle.tsx
│       ├── LanguageSwitcher.tsx
│       └── AnimateOnScroll.tsx
├── messages/               # Translations
│   ├── en.json
│   └── ru.json
├── lib/                    # Utilities and config
├── i18n/                   # next-intl config
└── services/               # AI and other services
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_BASE_URL` | Base URL of the site |
| `OPENROUTER_API_KEY` | OpenRouter API key (for AI services) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `APP_SECRET` | Secret for message API |

Without Redis, an in-memory store is used (suitable for development).

---

## Localization

- **Languages:** `en` (default), `ru`
- **URLs:** `/` — English, `/ru` — Russian
- **Translation files:** `messages/en.json`, `messages/ru.json`

