# Legal documents (Markdown)

Privacy Policy and Terms of Service are stored as Markdown files and rendered on the web app.

## File structure

- `privacy.en.md` — Privacy Policy (English)
- `privacy.ru.md` — Политика конфиденциальности (Russian)
- `terms.en.md` — Terms of Service (English)
- `terms.ru.md` — Условия использования (Russian)

## Editing

Edit the `.md` files directly. Changes will appear on the next build. Supports standard Markdown: headings, bold, links, lists.

Privacy and Terms describe **cloud AI** (OpenRouter; models such as Gemini, MiniMax, DeepSeek), **optional on-device / private AI** (local inference; model files may be downloaded from hosts such as Hugging Face), optional push tokens, **in-app support** (optional email + message + technical diagnostics stored in our database), **mobile advertising (Yandex Mobile Ads)** for users without a paid ad-free entitlement, and **paid features via App Store / Google Play in-app purchases** (with optional subscription-status verification). Wording is time-stamped via “Last updated” and may change. Keep in sync with mobile: `mobile/src/shared/lib/ai-core/orchestrator.ts` (execution mode), `mobile/src/screens/settings/ui/PrivateAiModeScreen.tsx`, `mobile/src/entities/settings/model/constants.ts` (cloud + local model catalogs), `mobile/src/features/app-storefront/model/useAdsAllowed.ts`, and `mobile/src/features/tech-support`.
