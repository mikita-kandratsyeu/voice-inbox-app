# Voice Inbox AI — Mobile

Offline-first **voice notes** for iOS and Android: record locally, transcribe with on-device Whisper, structure notes with private or cloud AI.

Repository overview: [../README.md](../README.md).

---

## Getting started

Install dependencies from the **repository root** (`yarn install` — see [../README.md](../README.md#monorepo-setup)).

```bash
cp mobile/.env.example mobile/.env
```

- **iOS:** Xcode, CocoaPods (`pod install` in `ios/` when needed). Copy `ios/VoiceInboxApp/GoogleService-Info.plist.example` → `GoogleService-Info.plist` and fill in your Firebase iOS app (the committed plist is a placeholder).
- **Android:** Copy `android/app/google-services.json.example` → `android/app/google-services.json` (gitignored) from Firebase.
- **Env:** `WEB_API_URL` for cloud AI; Firebase App Check for API auth (`FIREBASE_APP_CHECK_DEBUG_TOKEN` in debug); Yandex ad unit IDs optional; RevenueCat keys when subscriptions are enabled; `GITHUB_OAUTH_CLIENT_ID` optional embedded default for Pro GitHub sync (release: override via Firebase Remote Config — see below).

```bash
yarn workspace voice-inbox-app start
yarn workspace voice-inbox-app ios       # NODE_ENV=development
yarn workspace voice-inbox-app android
```

From `mobile/` you can still run `yarn start`, `yarn ios`, etc. after a root install.

Release builds: `yarn ios:release` / `yarn android:release` (`NODE_ENV=production`). Babel reads **`mobile/.env.production`** (not `.env`) when `NODE_ENV=production` for embedded `@env` defaults. **`GITHUB_OAUTH_CLIENT_ID`** for GitHub sync is typically set in **Firebase Remote Config** (key `GITHUB_OAUTH_CLIENT_ID`); optional fallback in `.env` / `.env.production` for dev or first launch before fetch.

---

## Features

- **Voice capture** — Full-screen UI with waveform, timer, pause/resume; audio stored on device first.
- **AI structure** — Tabs for _Transcript_, _Summary_, _Tasks_, and _Meeting dialogue_ on meeting-classified notes.
  - **Private** mode: on-device LLM (`llama.rn`) where enabled.
  - **Smart** mode: cloud AI via web API (HTTPS); in-app consent copy.
  - Optional **Apple embedding** APIs on iOS for vector search.

### Meeting dialogue (Pro meetings)

Shown on the recording detail screen when the note is classified as a **meeting** (Smart or Private AI).

| Capability                   | Smart (cloud)                                                                      | Private                                           |
| ---------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| Speaker-turn markdown        | Second job after summarize (`meeting_dialogue` on web) or inline for shorter notes | On-device batch in the same flow as summary/tasks |
| **Speaker roster**           | Rename display names; stored in `meetingSpeakerLabels` (SQLite)                    | Same                                              |
| **Regenerate dialogue only** | `POST /api/messages/:jobId/meeting-dialogue` — needs existing `cloudAiJobId`       | N/A                                               |
| Cancel in-flight dialogue    | Shared AI cancel + `meeting_dialogue` worker checks cancel flag                    | Local abort handle                                |

**UI:** `src/screens/recording-detail/` (`MeetingDialogueTab`, `MeetingDialogueSpeakerRoster`, `parseMeetingDialogue`, `meetingSpeakerLabels`).

**Cloud retry / regen:** `src/features/ai-processing/lib/regenerateMeetingDialogue.ts`.

**Settings → AI:** _Refresh speaker list when regenerating_ (`autoRefreshMeetingSpeakersOnRegen`, default **off**). When **off**, regenerating summary/tasks skips a new meeting-dialogue pass so renamed speakers stay as-is. When **on**, a full regen may replace dialogue and clear `meetingSpeakerLabels`. Dialogue-only regen prunes labels to speakers still present in the new markdown.

**Backup ZIP (v3):** `meetingDialogue` and `meetingSpeakerLabels` are included in `metadata.json` records (full `VoiceRecord` export).

- **Inbox** — Pins, folders, tags, archive/trash, text notes, batch actions.
- **Search** — Lexical scoring; **hybrid** ranking with local embeddings when stored (`src/features/search-records/`, `src/shared/lib/embeddings/`).
- **Themes** — System / light / dark (NativeWind + shared tokens).

### Advertising (Yandex Mobile Ads)

Banner (note detail), **rewarded** (bonus AI quota in Settings), and **interstitial** (after save/import/auto-organize, with caps) via `yandex-mobile-ads`. Shown only without Pro / ad-free entitlement. Env: `.env.example` (`YANDEX_*_AD_UNIT_ID`). Logic: `src/features/app-storefront/`, `src/features/yandex-interstitial/`.

### Firebase (FCM, Crashlytics, Analytics, Remote Config, App Check)

Push: `@react-native-firebase/messaging`. Crashlytics, Analytics, Remote Config, App Check ship in release builds with Firebase config files.

**Remote Config (release):** after `initRuntimeConfig()` on cold start, parameters such as `WEB_API_URL`, `PREVIEW_WEB_API_URL`, `WEBSITE_URL`, `PREVIEW_WEBSITE_URL`, `WEB_API_TARGET` (`production` \| `preview` — switches API and website together), RevenueCat keys, Yandex ad unit IDs, and **`GITHUB_OAUTH_CLIENT_ID`** override embedded `@env` defaults when non-empty. In `__DEV__`, only embedded `.env` is used (no RC fetch).

**Crashlytics in debug:** set `CRASHLYTICS_DEBUG=1` in `.env` and keep `mobile/firebase.json` (`crashlytics_debug_enabled`). Restart Metro with a clean cache and rebuild native.

**Test crash (iOS):** Settings → Debug → Test Crashlytics (`__DEV__` only). Do not keep the Xcode debugger attached when forcing a crash. Relaunch the app after crash so the report uploads. See [Firebase: test Crashlytics on iOS](https://firebase.google.com/docs/crashlytics/ios/test-implementation).

### Whisper (offline transcription)

`whisper.rn` downloads **GGML** weights from Hugging Face.

| Platform    | Behavior                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| **iOS**     | After each `.bin`, fetches matching `ggml-*-encoder.mlmodelc.zip` for Core ML on the Neural Engine when available |
| **Android** | `.bin` only (default GPU/CPU backend)                                                                             |

**Init & lifecycle**

- `src/shared/lib/whisper/resolveWhisperContextInitOptions.ts` — iOS Core ML vs Metal (`useGpu` off when Core ML is on).
- `src/features/transcription/lib/initWhisper.ts` — cached context, idle release (`WHISPER_IDLE_RELEASE_MS`).
- `src/features/transcription/lib/whisperNativeLifecycle.ts` — serializes native work (`enqueueWhisperOperation`), tracks idle for safe `releaseAllWhisper`.
- `src/features/transcription/model/transcriptionRuntimeRegistry.ts` — active jobs vs release.

Models downloaded before Core ML bundles existed: **delete the model in Settings and re-download**. The model picker “Recommended” badge uses RAM / `isLowRamDevice` (Android); nothing auto-downloads.

### App bootstrap

Cold start: `src/features/app-lifecycle/model/useAppBootstrap.ts` — Firebase App Check, `initDB`, runtime config + model manifest prefetch, record/folder load, trash purge, optional auto-archive, task-deadline notification sync, then UI ready; deferred push token / RevenueCat / analytics user id.

### Import & export

- **Full backup (ZIP)** — `metadata.json` v**3**, `audio/`, folders + records (`src/features/sync-data/`). Restore via document picker / import review screen. Records include AI fields (`meetingDialogue`, `meetingSpeakerLabels`, etc.).
- **GitHub sync (Pro)** — Settings → Backup & restore. Optional push of **markdown + metadata** (folders, graph layout) to **your** GitHub repository; **no audio**. Manual sync; each push creates a Git commit; browse history and restore a version from GitHub. OAuth **Device Flow** (`scope: repo`); access token in Keychain; requests go **directly to GitHub** (not through Voice Inbox servers). Default branch `voice-inbox`, files under `voice-inbox/` (`manifest.json`, `notes/{id}.md`). Public **Client ID** via embedded `GITHUB_OAUTH_CLIENT_ID` and/or **Firebase Remote Config** (`GITHUB_OAUTH_CLIENT_ID`); GitHub OAuth App must have Device Flow enabled; no client secret in the app. `src/features/github-sync/`.
- **Import audio** — Document picker → copy, optional WAV conversion, duration limits, optional transcription (`src/features/import-audio-file/`).
- **Per-note share** — Markdown briefs, plain share, email helpers (`src/features/share-record/`).
- **Batch export** — Inbox multi-select: Markdown or ZIP (`src/features/batch-select/`).

### Recording & system integrations

- **Deep links** — `voiceinbox://record/start`, `voiceinbox://note/text`, `voiceinbox://tasks`, `voiceinbox://stop-recording` (`src/app/deep-linking/`, `src/features/recording-deeplink/`).
- **iOS 16+** — App Intents (`ios/VoiceInboxApp/AppShortcuts.swift`); widgets / Live Activities (`ios/RecordingWidget/`, `ios/DownloadWidgetExtension/`).
- **Android** — Launcher shortcuts (`android/app/src/main/res/xml/shortcuts.xml`).

---

## Tech stack

| Area          | Choice                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Framework     | React Native 0.84 (CLI), TypeScript                                                             |
| UI            | React 19, NativeWind v4, `@gorhom/bottom-sheet`, FlashList                                      |
| Navigation    | React Navigation (stack + tabs + modals)                                                        |
| State         | Zustand per domain (`entities/*/model`, `features/*/model`)                                     |
| DB            | Drizzle + `@op-engineering/op-sqlite` — `src/shared/lib/db/schema.ts`, migrations in `drizzle/` |
| Prefs         | `react-native-mmkv`                                                                             |
| Audio / STT   | `react-native-nitro-sound`, `whisper.rn`                                                        |
| On-device LLM | `llama.rn`, optional `@react-native-ai/apple`                                                   |
| i18n          | `i18next`                                                                                       |
| Validation    | `zod`                                                                                           |

**Path aliases:** `@/`, `@entities/`, `@features/`, `@screens/`, `@shared/`, `@widgets/`, `@app/` (see `tsconfig.json`).

---

## Project layout

```
src/
  app/           App shell, navigation, deep linking
  entities/      Domain models, repositories, Zustand stores
  features/      Use cases (transcription, sync-data, ai-processing, app-lifecycle, …)
  screens/       Route-level UI (incl. recording-detail / meeting dialogue)
  widgets/       Composed UI blocks shared across screens
  shared/        config, lib (db, whisper, ai-core, analytics), ui
drizzle/         Generated SQL migrations
ios/ android/    Native projects, widgets, shortcuts
patches/         patch-package overrides
```

---

## Scripts

Run from repo root with `yarn workspace voice-inbox-app <script>`, or `cd mobile` and use `yarn <script>`.

| Script                            | Description                                |
| --------------------------------- | ------------------------------------------ |
| `start`                           | Metro (`NODE_ENV=development`)             |
| `ios` / `android`                 | Dev run on device/simulator                |
| `ios:release` / `android:release` | Release mode on device                     |
| `type:check`                      | `tsc --noEmit`                             |
| `lint` / `lint:fix`               | ESLint                                     |
| `test`                            | Jest                                       |
| `validate`                        | lint-staged + types + tests (pre-commit)   |
| `validate:push`                   | types + tests CI-style                     |
| `db:generate`                     | Drizzle SQL from `schema.ts`               |
| `analyze:bundle`                  | Bundle size report (optional platform arg) |

Monorepo quality gates: `yarn turbo run lint type:check test --filter=voice-inbox-app`.

`postinstall` runs `patch-package` and Android NetInfo Gradle fix.

---

## Related docs

- Legal / cloud behavior alignment: [../web/content/README.md](../web/content/README.md)
- Release version bump (repo root): `node ../scripts/release.mjs`

---

License: [PolyForm Noncommercial 1.0.0](../LICENSE) (repository root).
