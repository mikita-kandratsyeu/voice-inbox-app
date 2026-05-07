# Voice Inbox AI

Voice Inbox AI is an **offline-first voice notes** application built with React Native.

It lets you quickly capture ideas, meetings, and daily thoughts as audio, then turn them into **transcripts, concise summaries, and actionable tasks**.

The repository is a **single Git repo** with two standalone apps: **`mobile/`** (React Native) and **`web/`** (Next.js). There is no root `package.json` or Yarn workspaces — install and run scripts **from each app directory**. See [`.cursor/rules/repo-layout.mdc`](.cursor/rules/repo-layout.mdc) for commands and conventions.

The codebase is structured for a small team: clear layers (entities / features / screens), typed data access, and separation between local storage, on-device jobs, and optional cloud AI.


## Features (mobile)

- **Voice capture** — Full-screen recording with waveform, timer, pause/resume; audio is stored on device first.
- **Transcription & AI** — On-device Whisper transcription; tabs for _Transcript_, _Summary_, and _Tasks_; optional cloud LLM flows where enabled (with consent and network handling).
- **Inbox** — All recordings, pins, folders, tags, duration and preview metadata; batch actions and filters.
- **Search** — **Hybrid search**: lexical scoring over title, summary, transcript, tags, and tasks, combined with **local embeddings** when the embedding model is available (see `mobile/src/features/search-records/model/useSearchRecords.ts` and `mobile/src/shared/lib/embeddings/`).
- **Backup** — Export/import as zip (JSON metadata + audio files); see `mobile/src/features/sync-data/`.
- **Monetization & growth** — RevenueCat subscriptions, optional Yandex ads on non–ad-free tiers, Firebase (Analytics, Crashlytics, Messaging, Remote Config, App Check), in-app review prompts.
- **Platform extras (iOS)** — App Intents / Siri shortcuts, widgets and Live Activity extensions under `mobile/ios/`.
- **Theming** — System / light / dark; NativeWind plus shared color tokens.


## Tech stack — mobile (`mobile/`)

| Area | Choice |
|------|--------|
| Framework | React Native (CLI), TypeScript |
| UI | React 19, NativeWind (Tailwind-style), `@gorhom/bottom-sheet`, FlashList |
| Navigation | React Navigation (native stack + bottom tabs + modals) |
| Client state | **Zustand** stores per domain (`entities/*/model/store.ts`, `features/*/model/store.ts`) |
| Persistence | **Drizzle ORM** + **SQLite** via `@op-engineering/op-sqlite`; schema in `mobile/src/shared/lib/db/schema.ts`; migrations in `mobile/drizzle/` (`yarn db:generate` from `mobile/`) |
| Key-value / prefs | `react-native-mmkv`, settings entities |
| Audio | `react-native-nitro-sound`, Whisper via `whisper.rn`, optional `llama.rn` / Apple on-device AI where integrated |
| i18n | `i18next` + `react-i18next` |
| Validation / types | `zod` |

**Web (`web/`)** — Next.js, Prisma, Postgres; legal and marketing content in `web/content/`. Mobile does **not** share a database with web; each app owns its storage layer.


## Privacy & terms (web)

Legal pages are built from Markdown in **`web/content/`** (`privacy.*.md`, `terms.*.md`). They describe **current** behavior (e.g. Yandex ads when not on a paid ad-free tier, Firebase Crashlytics in release builds) and are tied to the “Last updated” date — revise when product or law changes. Code: `mobile/src/features/app-storefront/model/useAdsAllowed.ts`, `mobile/src/shared/lib/crashlytics.ts`.


## Release versioning

From the **repository root**, run `node scripts/release.mjs` to bump **semver** and **integer build** together in `mobile/package.json`, `web/package.json`, the iOS Xcode project (`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`), and `mobile/android/app/build.gradle` (`versionName` / `versionCode`). The script can create a commit and git tag `v<semver>`. Use `node scripts/release.mjs --help` for flags (`--dry-run`, `--no-git`, `--yes` with `RELEASE_VERSION` / `RELEASE_BUILD`, `--allow-dirty`).


## License

This project is **proprietary** and distributed under **UNLICENSED / all rights reserved** terms.

- See the root `LICENSE` file for the full terms.
- Third-party dependencies keep their own licenses.
