# Legal documents (Markdown)

Privacy Policy and Terms of Service are stored as Markdown files and rendered on the web app.

## File structure

- `privacy.en.md` — Privacy Policy (English)
- `privacy.ru.md` — Политика конфиденциальности (Russian)
- `terms.en.md` — Terms of Service (English)
- `terms.ru.md` — Условия использования (Russian)

## Editing

Edit the `.md` files directly. Changes will appear on the next build. Supports standard Markdown: headings, bold, links, lists.

Privacy and Terms describe AI processing (OpenRouter), optional push tokens, and **mobile advertising (Yandex Mobile Ads) outside the EEA** — keep them aligned with the React Native app behavior (`isEUUserByStorefront` / `useAdsAllowed`).
