# Voice Inbox AI — Mobile

Offline-first **voice notes** for iOS and Android: record locally, transcribe with on-device Whisper, structure notes with private or cloud AI.

Repository overview: [../README.md](../README.md).

---

## Getting started

```bash
cd mobile
yarn install
cp .env.example .env
```

- **iOS:** Xcode, CocoaPods (`pod install` in `ios/` when needed). `GoogleService-Info.plist` is in the project.
- **Android:** Add `android/app/google-services.json` from Firebase (required for Google Services / Crashlytics Gradle plugins).
- **Env:** `WEB_API_URL` / `WEB_API_SECRET` for Smart mode; Yandex ad unit IDs optional; RevenueCat keys when subscriptions are enabled.

```bash
yarn start
yarn ios       # APP_ENV=development
yarn android
```

Release builds: `yarn ios:release` / `yarn android:release` (`APP_ENV=production`).

---

## Features

- **Voice capture** — Full-screen UI with waveform, timer, pause/resume; audio stored on device first.
- **AI structure** — Tabs for _Transcript_, _Summary_, _Tasks_, and meeting-style dialogue when relevant.
  - **Private** mode: on-device LLM (`llama.rn`) where enabled.
  - **Smart** mode: cloud AI via web API (HTTPS); in-app consent copy.
  - Optional **Apple embedding** APIs on iOS for vector search.
- **Inbox** — Pins, folders, tags, archive/trash, text notes, batch actions.
- **Search** — Lexical scoring; **hybrid** ranking with local embeddings when stored (`src/features/search-records/`, `src/shared/lib/embeddings/`).
- **Themes** — System / light / dark (NativeWind + shared tokens).

### Advertising (Yandex Mobile Ads)

Banner (note detail), **rewarded** (bonus AI quota in Settings), and **interstitial** (after save/import/auto-organize, with caps) via `yandex-mobile-ads`. Shown only without Pro / ad-free entitlement. Env: `.env.example` (`YANDEX_*_AD_UNIT_ID`). Logic: `src/features/app-storefront/`, `src/features/yandex-interstitial/`.

### Firebase (FCM, Crashlytics, Analytics, Remote Config, App Check)

Push: `@react-native-firebase/messaging`. Crashlytics, Analytics, Remote Config, App Check ship in release builds with Firebase config files.

**Crashlytics in debug:** set `CRASHLYTICS_DEBUG=1` in `.env` and keep `mobile/firebase.json` (`crashlytics_debug_enabled`). Restart Metro with a clean cache and rebuild native.

**Test crash (iOS):** Settings → Debug → Test Crashlytics (`__DEV__` only). Do not keep the Xcode debugger attached when forcing a crash. Relaunch the app after crash so the report uploads. See [Firebase: test Crashlytics on iOS](https://firebase.google.com/docs/crashlytics/ios/test-implementation).

### Whisper (offline transcription)

`whisper.rn` downloads **GGML** weights from Hugging Face.

| Platform | Behavior |
| -------- | -------- |
| **iOS** | After each `.bin`, fetches matching `ggml-*-encoder.mlmodelc.zip` for Core ML on the Neural Engine when available |
| **Android** | `.bin` only (default GPU/CPU backend) |

**Init & lifecycle**

- `src/shared/lib/whisper/resolveWhisperContextInitOptions.ts` — iOS Core ML vs Metal (`useGpu` off when Core ML is on).
- `src/features/transcription/lib/initWhisper.ts` — cached context, idle release (`WHISPER_IDLE_RELEASE_MS`).
- `src/features/transcription/lib/whisperNativeLifecycle.ts` — serializes native work (`enqueueWhisperOperation`), tracks idle for safe `releaseAllWhisper`.
- `src/features/transcription/model/transcriptionRuntimeRegistry.ts` — active jobs vs release.

Models downloaded before Core ML bundles existed: **delete the model in Settings and re-download**. The model picker “Recommended” badge uses RAM / `isLowRamDevice` (Android); nothing auto-downloads.

### Import & export

- **Full backup (ZIP)** — `metadata.json` v**3**, `audio/`, folders + records (`src/features/sync-data/`). Restore via document picker / import review screen.
- **Import audio** — Document picker → copy, optional WAV conversion, duration limits, optional transcription (`src/features/import-audio-file/`).
- **Per-note share** — Markdown briefs, plain share, email helpers (`src/features/share-record/`).
- **Batch export** — Inbox multi-select: Markdown or ZIP (`src/features/batch-select/`).

### Recording & system integrations

- **Deep links** — `voiceinbox://record/start`, `voiceinbox://note/text`, `voiceinbox://tasks`, `voiceinbox://stop-recording` (`src/app/deep-linking/`, `src/features/recording-deeplink/`).
- **iOS 16+** — App Intents (`ios/VoiceInboxApp/AppShortcuts.swift`); widgets / Live Activities (`ios/RecordingWidget/`, `ios/DownloadWidgetExtension/`).
- **Android** — Launcher shortcuts (`android/app/src/main/res/xml/shortcuts.xml`).

---

## Tech stack

| Area | Choice |
| ---- | ------ |
| Framework | React Native 0.84 (CLI), TypeScript |
| UI | React 19, NativeWind v4, `@gorhom/bottom-sheet`, FlashList |
| Navigation | React Navigation (stack + tabs + modals) |
| State | Zustand per domain (`entities/*/model`, `features/*/model`) |
| DB | Drizzle + `@op-engineering/op-sqlite` — `src/shared/lib/db/schema.ts`, migrations in `drizzle/` |
| Prefs | `react-native-mmkv` |
| Audio / STT | `react-native-nitro-sound`, `whisper.rn` |
| On-device LLM | `llama.rn`, optional `@react-native-ai/apple` |
| i18n | `i18next` |
| Validation | `zod` |

**Path aliases:** `@/`, `@entities/`, `@features/`, `@screens/`, `@shared/`, `@widgets/`, `@app/` (see `tsconfig.json`).

---

## Project layout

```
src/
  app/           App shell, navigation, deep linking
  entities/      Domain models, repositories, Zustand stores
  features/      Use cases (transcription, sync-data, search-records, …)
  screens/       Route-level UI
  widgets/       Composed UI blocks shared across screens
  shared/        config, lib (db, whisper, ai-core, analytics), ui
drizzle/         Generated SQL migrations
ios/ android/    Native projects, widgets, shortcuts
patches/         patch-package overrides
```

---

## Scripts (from `mobile/`)

| Script | Description |
| ------ | ----------- |
| `yarn start` | Metro (`APP_ENV=development`) |
| `yarn ios` / `yarn android` | Dev run on device/simulator |
| `yarn ios:release` / `yarn android:release` | Release mode on device |
| `yarn type:check` | `tsc --noEmit` |
| `yarn lint` / `yarn lint:fix` | ESLint |
| `yarn test` | Jest |
| `yarn validate` | lint-staged + types + tests (pre-commit) |
| `yarn validate:push` | types + tests CI-style |
| `yarn db:generate` | Drizzle SQL from `schema.ts` |
| `yarn analyze:bundle` | Bundle size report (optional platform arg) |

`postinstall` runs `patch-package` and Android NetInfo Gradle fix.

---

## Related docs

- Legal / cloud behavior alignment: [../web/content/README.md](../web/content/README.md)
- Release version bump (repo root): `node ../scripts/release.mjs`
