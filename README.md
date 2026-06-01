# Voice Inbox AI

Voice Inbox AI is an **offline-first voice notes** application: capture audio on device, then get **transcripts, summaries, and actionable tasks** — with optional cloud AI and a public web presence.

This repository is a **single Git repo** with **standalone** apps (no root `package.json`, no Yarn workspaces). Install dependencies and run scripts **from each app directory**. **Node.js ≥ 24.**

| App | Path | Role |
|-----|------|------|
| **Mobile** | [`mobile/`](mobile/) | React Native app — Drizzle + SQLite, on-device Whisper, optional cloud API |
| **Web** | [`web/`](web/) | Next.js landing, legal pages, mobile API, admin dashboard |
| **Telegram bot** | [`telegram-bot/`](telegram-bot/) | Optional Grammy admin bot (same Postgres as web) |

Detailed setup and feature lists: **[mobile/README.md](mobile/README.md)** · **[web/README.md](web/README.md)** · **[telegram-bot/README.md](telegram-bot/README.md)**.

Cursor/agent conventions: [`.cursor/rules/repo-layout.mdc`](.cursor/rules/repo-layout.mdc).


## Quick start

### Mobile (`mobile/`)

```bash
cd mobile
yarn install
cp .env.example .env
# iOS: Xcode + CocoaPods; Android: google-services.json from Firebase
yarn start
yarn ios    # or yarn android
```

Quality gates: `yarn lint`, `yarn type:check`, `yarn test` (or `yarn validate` before push).

### Web (`web/`)

```bash
cd web
yarn install
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, APP_SECRET, …
yarn db:push
yarn db:seed    # first superadmin when ADMIN_SEED_* are set
yarn dev
```

Admin UI: `/admin`. Legal copy: [`web/content/`](web/content/).

### Telegram bot (`telegram-bot/`)

```bash
cd telegram-bot
yarn install
cp .env.example .env
yarn dev
```

Requires `DATABASE_URL`, `WEB_ADMIN_URL`, and `TELEGRAM_BOT_API_SECRET` (same value as on web) for API-backed menus.


## Mobile highlights

- **Voice capture** — Waveform, timer, pause/resume; audio stored locally first.
- **Transcription** — On-device Whisper (`whisper.rn`); iOS Core ML encoder when downloaded; context lifecycle in `mobile/src/features/transcription/`.
- **AI** — Private (on-device `llama.rn`) and Smart (HTTPS to web API); tabs for transcript, summary, tasks, meeting dialogue.
- **Inbox** — Folders, tags, pins, archive/trash, batch actions.
- **Search** — Hybrid lexical + local embeddings when available (`mobile/src/features/search-records/`, `mobile/src/shared/lib/embeddings/`).
- **Backup** — ZIP export/import (`mobile/src/features/sync-data/`).
- **Monetization** — RevenueCat; optional Yandex ads (banner, rewarded, interstitial) without Pro.
- **Platform** — Firebase, deep links, iOS widgets / App Intents, Android shortcuts.

Stack summary: React Native 0.84, React 19, NativeWind, Zustand, Drizzle + op-sqlite — see [mobile/README.md](mobile/README.md).


## Web highlights

- **Site** — i18n (`en` / `ru`), marketing pages, blog, backup ZIP viewer.
- **API** — JWT auth, async AI jobs (QStash or `after()`), support intake, Pro license sync.
- **Admin** — Support inbox, push, release notes, audit log, infra status — see [web/README.md](web/README.md).


## Privacy & terms

Legal pages are Markdown in **`web/content/`** (`privacy.*.md`, `terms.*.md`). Keep them aligned with product behavior (ads, Firebase, cloud AI, IAP). Update **Last updated** when behavior changes. See [web/content/README.md](web/content/README.md) and [`.cursor/rules/legal-content.mdc`](.cursor/rules/legal-content.mdc).


## Release versioning

From the **repository root**:

```bash
node scripts/release.mjs
```

Bumps semver + integer build in `mobile/package.json`, `web/package.json`, iOS `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`, and Android `versionName` / `versionCode`. Optional git commit and tag `v<semver>`. Flags: `--dry-run`, `--no-git`, `--yes` with `RELEASE_VERSION` / `RELEASE_BUILD`, `--allow-dirty` — run `node scripts/release.mjs --help`.


## Security

See [SECURITY.md](SECURITY.md) for supported versions and how to report vulnerabilities.


## License

**Proprietary** — UNLICENSED / all rights reserved. See [LICENSE](LICENSE). Third-party dependencies retain their own licenses.
