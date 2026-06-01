# Legal documents (Markdown)

Privacy Policy and Terms of Service for the web app. Rendered at build/runtime from these files.

## File structure

| File | Description |
| ---- | ----------- |
| `privacy.en.md` | Privacy Policy (English) |
| `privacy.ru.md` | Политика конфиденциальности (Russian) |
| `terms.en.md` | Terms of Service (English) |
| `terms.ru.md` | Условия использования (Russian) |

## Editing

Edit the `.md` files directly. Changes appear on the next deploy/build. Standard Markdown: headings, bold, links, lists.

### Keep in sync with the product

Update **English and Russian** in the same change when possible. Revise the **Last updated** date when behavior changes materially.

Align claims with implementation:

| Topic | Code references |
| ----- | ---------------- |
| Analytics | `mobile/src/shared/lib/analytics.ts` |
| Crashlytics | `mobile/src/shared/lib/crashlytics.ts` |
| Ads | `mobile/src/features/app-storefront/`, `mobile/src/features/yandex-interstitial/` |
| Entitlements / IAP | `mobile/src/features/entitlements/`, `mobile/src/features/pro-license/`, `web/app/api/pro-license/**` |
| Cloud vs private AI | `mobile/src/shared/lib/ai-core/`, `mobile/src/screens/settings/ui/PrivateAiModeScreen.tsx`, `mobile/src/entities/settings/model/constants.ts` |
| Support diagnostics | `mobile/src/features/tech-support/`, `web/app/api/support/**` |
| Cloud API / rate limits | `web/services/ai.service.ts`, `web/services/translate.service.ts`, `web/services/ask.service.ts`, `web/config/constants.ts` |

Cursor rule: [`.cursor/rules/legal-content.mdc`](../../.cursor/rules/legal-content.mdc).

Topics covered in legal copy include: cloud AI (OpenRouter and direct providers), on-device / private AI (e.g. Hugging Face model downloads), push tokens, in-app support storage, Android waitlist, Yandex Mobile Ads, and App Store / Google Play IAP.
