# Voice Inbox AI

Voice Inbox AI is an **offline‑first voice notes** application built with React Native.  

It lets you quickly capture ideas, meetings, and daily thoughts as audio, then turn them into **transcripts, concise summaries, and actionable tasks**.

The project is designed as a solo‑friendly, production‑ready codebase: clean architecture, modular features, and a clear separation between offline storage, background jobs, and cloud processing.

---

## Features

- 🎙 **Fast voice capture**
  - Full‑screen recording UI with waveform, timer, and pause/resume
  - Offline by default — recordings are stored locally first

- 🧠 **AI structure**
  - Tabs for _Transcript_, _Summary_, _Tasks_, and (when relevant) meeting-style dialogue
  - **Private** mode: on-device LLM (`llama.rn`) for summaries/tasks and related flows where enabled
  - **Smart** mode: cloud AI via the app backend (HTTPS); consent and data-handling copy live in-app
  - Optional **Apple embedding** APIs on iOS for vector features (see Search)

- 📁 **Inbox & organization**
  - Pinned section, folders, tags, archive/trash with retention
  - Text notes alongside voice captures where supported

- 🔍 **Search**
  - Lexical search over title, summary, transcript, tags, and task text
  - When notes have stored embeddings (generated alongside supported AI / embedding flows and device capabilities), **hybrid ranking** blends lexical relevance and semantic similarity for longer queries

- 🌗 **Light & Dark theme**
  - System / Light / Dark modes
  - Tailwind‑style theming with NativeWind

- 🧱 **Modern React Native stack**
  - React Native CLI + TypeScript
  - React Navigation (native stack + bottom tabs)
  - NativeWind (Tailwind for React Native)
  - Feature-oriented layout under `src/` (`entities/`, `features/`, `screens/`, `shared/`)

### Advertising (Yandex Mobile Ads)

Optional **banner** (note detail) and **rewarded** ad (bonus AI quota in Settings) use `yandex-mobile-ads`. The SDK is initialized and ads may show for users **without** an active Pro / ad-free entitlement. Env: `.env.example` (`YANDEX_*_AD_UNIT_ID`).

### Firebase (FCM, Crashlytics, Analytics, Remote Config, App Check)

Push uses `@react-native-firebase/messaging`; crash reports use `@react-native-firebase/crashlytics`. Analytics, Remote Config, and App Check are also wired for the builds that ship with `GoogleService-Info.plist` / `google-services.json`. **iOS:** `GoogleService-Info.plist` in the Xcode project (already present). **Android:** add `android/app/google-services.json` from the Firebase console (same project as iOS). Without it, the Android build fails after applying the Google Services / Crashlytics Gradle plugins. Enable **Crashlytics** for the Firebase app in the console. Release builds send crashes. Debug builds disable collection unless you set **`CRASHLYTICS_DEBUG=1`** in `.env` and keep **`mobile/firebase.json`** (`crashlytics_debug_enabled`). Then restart Metro with a clean cache and rebuild the native app. Support tickets include a `crashlytics` object in diagnostics (collection flag + previous-session crash).

**Testing Crashlytics on iOS** (same flow as [Firebase: test your implementation](https://firebase.google.com/docs/crashlytics/ios/test-implementation)):

1. Ensure dSYM upload is set up (RN Firebase adds a **Crashlytics** run script build phase; see Firebase [get started](https://firebase.google.com/docs/crashlytics/ios/get-started#set-up-dsym-uploading)).
2. **Do not keep the Xcode debugger attached** when forcing a crash — it blocks reports. Build & run once, then **stop** the scheme in Xcode, then open the app from the **home screen** (or simulator springboard).
3. In the app, use the **Debug → Test Crashlytics** row in Settings (`__DEV__` only), which calls `crash(getCrashlytics())`.
4. After the app crashes, **launch it again** so the pending report can upload.
5. Check the [Crashlytics dashboard](https://console.firebase.google.com/) within a few minutes. If nothing appears, add **`-FIRDebugEnabled`** under *Product → Scheme → Edit Scheme → Run → Arguments Passed on Launch* and look in the Xcode console for a log line containing **`Completed report submission`**.

### Whisper (offline transcription)

`whisper.rn` downloads **GGML** weights from Hugging Face. On **iOS**, after each `.bin` download the app also fetches the matching **`ggml-*-encoder.mlmodelc.zip`**, unzips it next to the `.bin`, and calls `initWhisper` with **`useCoreMLIos: true`** so the encoder can run on the Neural Engine when available (falls back to CPU if the bundle is missing or fails). **Android** only uses the `.bin` file. Models downloaded before this behavior was added have no Core ML bundle — **delete the model in Settings and download again** to pick up the encoder. The onboarding / model picker **“Recommended”** badge uses RAM and `isLowRamDevice` (Android) to suggest tiny → base → small → medium; nothing is auto-downloaded.

### Import & export

- **Full backup (ZIP)** — Settings can build an archive (`metadata.json` at version **3**, `audio/` copies, folders + records) and hand it to the system share sheet (`exportData` in `src/features/sync-data/`). Restoring opens the same format via the document picker / onboarding import path (`importData`), with an **Import records** screen to review and merge incoming notes when needed.
- **Import audio** — Pick supported audio via the system document picker (and compatible “Open in” flows) to create a new note; the pipeline copies, may convert to WAV, **reads duration** to enforce import limits, saves the record, then optionally kicks off transcription (`src/features/import-audio-file/`; progress: copying → converting → analyzing).
- **Per-note share** — Markdown (`.md`) briefs (note / meeting / speaker-turns templates), plain share, and optional email helpers live under `src/features/share-record/` (cached export files are pruned automatically).
- **Batch export** — Multi-select in the inbox: Markdown as separate files or a **ZIP**, plus optional batch email (`src/features/batch-select/`).

### Recording & system integrations

- **Deep links** — Custom scheme URLs such as `voiceinbox://record/start`, `voiceinbox://note/text`, `voiceinbox://tasks`, and `voiceinbox://stop-recording` are handled in JS (`src/app/deep-linking/`, `src/features/recording-deeplink/`) and opened from native entry points.
- **iOS (16+)** — `AppShortcuts` (`ios/VoiceInboxApp/AppShortcuts.swift`) exposes App Intents that jump straight into record, new text note, or all tasks. **Widgets / Live Activities** under `ios/RecordingWidget/` and `ios/DownloadWidgetExtension/` surface recording controls and Whisper model download progress; buttons resolve to the same `voiceinbox://` URLs.
- **Android** — Static launcher shortcuts in `android/app/src/main/res/xml/shortcuts.xml` mirror the record / text note / tasks deep links.

---

## Tech stack

- **Framework:** React Native (CLI)
- **Language:** TypeScript
- **Navigation:** React Navigation (native stack + bottom tabs)
- **Styling:** NativeWind (Tailwind CSS‑like utilities)
- **Client state:** React hooks plus **Zustand** stores for domains such as records, settings, folders, onboarding, and app lock
- **Persistence:** **`@op-engineering/op-sqlite`** (SQLite) with **Drizzle ORM** (`src/shared/lib/db/`) — schema in `schema.ts`, SQL migrations in `migrations.ts`, generated SQL under `drizzle/` (`yarn db:generate` from this app directory)
- **Key-value / prefs:** `react-native-mmkv` and small helpers where appropriate
- **Monetization:** RevenueCat (`react-native-purchases`) for subscriptions; optional Yandex ads for non‑Pro users (see above)
- **Theming:** Custom light/dark palette with context + NativeWind `dark` mode

### Scripts (from `mobile/`)

- `yarn start` / `yarn ios` / `yarn android` — dev
- `yarn type:check`, `yarn lint`, `yarn test` — quality gates (`yarn validate` runs staged lint + types + tests)
- `yarn db:generate` — refresh Drizzle SQL after editing `schema.ts` (review generated migrations before shipping)
