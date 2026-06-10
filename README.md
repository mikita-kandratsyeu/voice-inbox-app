# Voice Inbox AI

Voice Inbox AI is an **offline-first voice notes** application: capture audio on device, then get **transcripts, summaries, and actionable tasks** — with optional cloud AI and a public web presence.

This repository is a **Yarn 4 workspaces** monorepo with **Turborepo** task orchestration. One `yarn.lock` at the root; apps in `web/`, `mobile/`, and `telegram-bot/`. **Node.js ≥ 24.**

| App | Package | Path | Role |
|-----|---------|------|------|
| **Mobile** | `voice-inbox-app` | [`mobile/`](mobile/) | React Native app — Drizzle + SQLite, on-device Whisper, optional cloud API |
| **Web** | `voice-inbox-web` | [`web/`](web/) | Next.js landing, legal pages, mobile API, admin dashboard |
| **Telegram bot** | `voice-inbox-telegram-bot` | [`telegram-bot/`](telegram-bot/) | Optional Grammy admin bot (same Postgres as web) |

Detailed setup and feature lists: **[mobile/README.md](mobile/README.md)** · **[web/README.md](web/README.md)** · **[telegram-bot/README.md](telegram-bot/README.md)** · shared packages: **[packages/README.md](packages/README.md)**.

Cursor/agent conventions: [`.cursor/rules/repo-layout.mdc`](.cursor/rules/repo-layout.mdc).


## Monorepo setup

From the **repository root**:

```bash
yarn install
# If a parent directory also has Yarn workspaces, use:
# node .yarn/releases/yarn-4.16.0.cjs install
```

| Command | Description |
| ------- | ----------- |
| `yarn lint` | ESLint in all apps (via Turbo) |
| `yarn type:check` | TypeScript + Prisma generate (web) |
| `yarn test` | Jest in all apps |
| `yarn ci` | Full CI: `format:check` + `lint` + `type:check` + `build` + `test` (all workspaces) |
| `yarn ci:affected` | Same as `ci`, only packages changed vs `origin/main` |
| `yarn validate` | `lint` + `type:check` + `test` (no format/build) |
| `yarn validate:affected` | Same as `validate`, only changed packages |
| `yarn dev:web` | Next.js dev server |
| `yarn build` | Production builds (`web` → `next build`) |

Filter a single app: `yarn turbo run test --filter=voice-inbox-web`.

Workspace scripts: `yarn workspace voice-inbox-app ios`, `yarn workspace voice-inbox-web db:push`, etc.


## Quick start

### Mobile (`mobile/`)

```bash
yarn install    # from repo root
cp mobile/.env.example mobile/.env
# iOS: Xcode + CocoaPods; Android: google-services.json from Firebase
yarn workspace voice-inbox-app start
yarn workspace voice-inbox-app ios    # or android
```

Quality gates: `yarn turbo run lint type:check test --filter=voice-inbox-app`, or `yarn workspace voice-inbox-app validate` before push.

### Web (`web/`)

```bash
yarn install    # from repo root
cp web/.env.example web/.env
# Set DATABASE_URL, JWT_SECRET, FIREBASE_SERVICE_ACCOUNT, …
yarn workspace voice-inbox-web db:push
yarn workspace voice-inbox-web db:seed    # first superadmin when ADMIN_SEED_* are set
yarn dev:web
```

Admin UI: `/admin`. Legal copy: [`web/content/`](web/content/).

**Vercel:** set **Root Directory** to `web` and **Install Command** to `cd .. && yarn install --immutable` (monorepo install from parent), or deploy from repo root with build `yarn turbo run build --filter=voice-inbox-web`.

### Telegram bot (`telegram-bot/`)

```bash
yarn install    # from repo root
cp telegram-bot/.env.example telegram-bot/.env
yarn dev:telegram-bot
```

Requires `DATABASE_URL`, `WEB_ADMIN_URL`, and `TELEGRAM_BOT_API_SECRET` (same value as on web) for API-backed menus.


## Mobile highlights

- **Voice capture** — Waveform, timer, pause/resume; audio stored locally first.
- **Transcription** — On-device Whisper (`whisper.rn`); iOS Core ML encoder when downloaded; context lifecycle in `mobile/src/features/transcription/`.
- **AI** — Private (on-device `llama.rn`) and Smart (HTTPS to web API); tabs for transcript, summary, tasks, and **meeting dialogue** (speaker turns, renameable roster on Pro meetings).
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
