# Legal documents (Markdown)

Privacy Policy and Terms of Service are stored as Markdown files and rendered on the web app.

## File structure

- `privacy.en.md` — Privacy Policy (English)
- `privacy.ru.md` — Политика конфиденциальности (Russian)
- `terms.en.md` — Terms of Service (English)
- `terms.ru.md` — Условия использования (Russian)

## Editing

Edit the `.md` files directly. Changes will appear on the next build. Supports standard Markdown: headings, bold, links, lists.

Privacy and Terms describe AI processing (OpenRouter), optional push tokens, **in-app support** (optional email + message + technical diagnostics stored in our database), **mobile advertising (Yandex Mobile Ads)** — including that **EEA storefronts currently have ads off** in the app — and **Voice Inbox Pro** (license keys: hashed on the server, one device per key; optional future App Store / Google Play subscriptions and a subscription-status provider). Wording is time-stamped via “Last updated” and may change. Keep in sync with the app (`isEUUserByStorefront` / `useAdsAllowed`, Pro flow in `features/pro-license`, support in `features/tech-support`).
