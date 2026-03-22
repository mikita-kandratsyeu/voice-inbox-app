# Voice Inbox AI

Voice Inbox AI is an **offline‑first voice notes** application built with React Native.  

It lets you quickly capture ideas, meetings, and daily thoughts as audio, then turn them into **transcripts, concise summaries, and actionable tasks**.

The project is designed as a solo‑friendly, production‑ready codebase: clean architecture, modular features, and a clear separation between offline storage, background jobs, and cloud processing.

---

## Features

- 🎙 **Fast voice capture**
  - Full‑screen recording UI with waveform, timer, and pause/resume
  - Offline by default — recordings are stored locally first

- 🧠 **AI‑ready structure**
  - Tabs for _Transcript_, _Summary_, and _Tasks_
  - Data model prepared for cloud STT + LLM summarization

- 📁 **Inbox for all recordings**
  - Pinned section for important notes
  - Tags, quick metadata (duration, time, short preview)

- 🔍 **Search**
  - Simple search over titles and previews (prepared for semantic search later)

- 🌗 **Light & Dark theme**
  - System / Light / Dark modes
  - Tailwind‑style theming with NativeWind

- 🧱 **Modern React Native stack**
  - React Native CLI + TypeScript
  - React Navigation (stack + bottom tabs)
  - NativeWind (Tailwind for React Native)
  - Clean folder structure and typed repositories

### Advertising (Yandex Mobile Ads)

Optional **banner** (note detail) and **rewarded** ad (bonus AI quota in Settings) use `yandex-mobile-ads`. The SDK is initialized and ads may show for users **without** an active Pro / ad-free entitlement. Env: `.env.example` (`YANDEX_*_AD_UNIT_ID`).

### Firebase (FCM, Crashlytics)

Push uses `@react-native-firebase/messaging`; crash reports use `@react-native-firebase/crashlytics`. **iOS:** `GoogleService-Info.plist` in the Xcode project (already present). **Android:** add `android/app/google-services.json` from the Firebase console (same project as iOS). Without it, the Android build fails after applying the Google Services / Crashlytics Gradle plugins. Enable **Crashlytics** for the Firebase app in the console. Release builds send crashes. Debug builds disable collection unless you set **`CRASHLYTICS_DEBUG=1`** in `.env` and keep **`mobile/firebase.json`** (`crashlytics_debug_enabled`). Then restart Metro with a clean cache and rebuild the native app. Support tickets include a `crashlytics` object in diagnostics (collection flag + previous-session crash).

**Testing Crashlytics on iOS** (same flow as [Firebase: test your implementation](https://firebase.google.com/docs/crashlytics/ios/test-implementation)):

1. Ensure dSYM upload is set up (RN Firebase adds a **Crashlytics** run script build phase; see Firebase [get started](https://firebase.google.com/docs/crashlytics/ios/get-started#set-up-dsym-uploading)).
2. **Do not keep the Xcode debugger attached** when forcing a crash — it blocks reports. Build & run once, then **stop** the scheme in Xcode, then open the app from the **home screen** (or simulator springboard).
3. In the app, use the **Debug → Test Crashlytics** row in Settings (`__DEV__` only), which calls `crash(getCrashlytics())`.
4. After the app crashes, **launch it again** so the pending report can upload.
5. Check the [Crashlytics dashboard](https://console.firebase.google.com/) within a few minutes. If nothing appears, add **`-FIRDebugEnabled`** under *Product → Scheme → Edit Scheme → Run → Arguments Passed on Launch* and look in the Xcode console for a log line containing **`Completed report submission`**.

### Whisper (offline transcription)

`whisper.rn` downloads **GGML** weights from Hugging Face. On **iOS**, after each `.bin` download the app also fetches the matching **`ggml-*-encoder.mlmodelc.zip`**, unzips it next to the `.bin`, and calls `initWhisper` with **`useCoreMLIos: true`** so the encoder can run on the Neural Engine when available (falls back to CPU if the bundle is missing or fails). **Android** only uses the `.bin` file. Models downloaded before this behavior was added have no Core ML bundle — **delete the model in Settings and download again** to pick up the encoder. The onboarding / model picker **“Recommended”** badge uses RAM and `isLowRamDevice` (Android) to suggest tiny → base → small → medium; nothing is auto-downloaded.

---

## Tech stack

- **Framework:** React Native (CLI)
- **Language:** TypeScript
- **Navigation:** React Navigation (native stack + bottom tabs)
- **Styling:** NativeWind (Tailwind CSS‑like utilities)
- **State:** React hooks (no global state manager yet)
- **Data:** In‑memory(prepared for SQLite)
- **Theming:** Custom light/dark theme with context + NativeWind `dark` mode
