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

---

## Tech stack

- **Framework:** React Native (CLI)
- **Language:** TypeScript
- **Navigation:** React Navigation (native stack + bottom tabs)
- **Styling:** NativeWind (Tailwind CSS‑like utilities)
- **State:** React hooks (no global state manager yet)
- **Data:** In‑memory(prepared for SQLite)
- **Theming:** Custom light/dark theme with context + NativeWind `dark` mode

---

## Privacy & terms (web)

Legal pages are built from Markdown in **`web/content/`** (`privacy.*.md`, `terms.*.md`). They describe **current** behavior (e.g. Yandex ads off for EU storefronts **for now**) and are tied to the “Last updated” date — revise when product or law changes. Code: `mobile/src/features/app-storefront/lib/storefront.ts`, `useAdsAllowed`.
