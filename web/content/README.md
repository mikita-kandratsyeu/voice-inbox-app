# Legal documents (Markdown)

Privacy Policy and Terms of Service are stored as Markdown files and rendered on the web app.

## File structure

- `privacy.en.md` — Privacy Policy (English)
- `privacy.ru.md` — Политика конфиденциальности (Russian)
- `terms.en.md` — Terms of Service (English)
- `terms.ru.md` — Условия использования (Russian)

## Editing

Edit the `.md` files directly. Changes will appear on the next build. Supports standard Markdown: headings, bold, links, lists.

Privacy and Terms describe AI processing (OpenRouter), optional push tokens, **in-app support** (optional email + message + technical diagnostics stored in our database), and **mobile advertising (Yandex Mobile Ads)** — including that **EEA storefronts currently have ads off** in the app; wording is time-stamped via “Last updated” and may change. Keep in sync with the app (`isEUUserByStorefront` / `useAdsAllowed`, support flow in `features/tech-support`).
