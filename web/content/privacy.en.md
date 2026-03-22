# Privacy Policy

**Last updated: April 2026**

Voice Inbox AI ("we", "our", or "the app") is an offline voice notes application. This Privacy Policy explains how we handle your data when you use the mobile app, the optional web API for AI processing, and optional in-app support requests.

## 1. Data We Process

Voice recordings, transcripts, summaries, tasks, and tags are stored locally on your device. We have no access to this data unless you use AI features that send data to our servers.

When using AI features (summaries, task extraction, Ask AI), the app sends transcript text to our web API over HTTPS. The transcript is forwarded to third-party AI providers via the OpenRouter platform to generate results. We do not store transcripts on our servers.

The app does **not** use standalone analytics SDKs or user-behavior profiling tools for product analytics.

**Crash reporting (Firebase Crashlytics):** In **release** builds, the app may send crash and stability diagnostics to [Google Firebase Crashlytics](https://firebase.google.com/products/crashlytics) so we can find and fix defects. Collection is **off** in development/debug builds. We may set an anonymous app-specific device identifier in Crashlytics (the same value used for API access and rate limiting — see “Our Web API” below) so we can relate a support request to crash logs when you contact us. Crashlytics is operated under Google’s terms and policies.

**Advertising (Yandex Mobile Ads; EEA storefronts):** *As of the “Last updated” date above*, we only enable **Yandex Mobile Ads** — a banner on the note detail screen and an optional rewarded ad that can grant bonus AI quota — when your App Store or Play Store country is **outside** the European Economic Area (EEA). **For EEA storefronts, these features are currently turned off in the app.** We may change this in the future (for example, to show ads in the EEA where permitted and with any consent or controls required by law); if we do, we will update this Privacy Policy and the date at the top. The ad SDK operates under Yandex’s policies; we use it only to serve ads, not for cross-app tracking or analytics on our behalf.

## 2. Our Web API

Our API temporarily stores only the AI result (summary, tasks, tags) in a key-value store that expires after 1 hour. After one hour, this data is automatically deleted. We never store transcripts permanently.

Access to the API is authenticated using short-lived tokens that are bound to your device ID. We do not store these tokens on our servers; they are validated and then discarded. We use the device identifier to limit the number of free AI requests per week per device. This identifier is used solely for rate limiting and authentication and is not linked to your identity.

If you enable push notifications, we store your push token (FCM) and app language on our servers. This data is used solely to send you notifications about completed AI processing and important updates. The push token is stored for 30 days and refreshed on every app launch. You can revoke notification permission at any time in your device’s system settings (e.g. iOS Settings or Android app notification settings).

**In-app support:** If you use the “Contact support” flow, you may send us a description of the issue and, optionally, your email (so we can reply), a short subject, and any extra text you choose to paste (for example, an error message). The app also attaches a **technical diagnostics** package (such as app version, OS version, device model, memory/disk hints, network type, locale, timezone, an app-specific device identifier already used for API access — see above, and whether Firebase Crashlytics collection is enabled and whether the previous app session ended in a crash). These submissions are transmitted over HTTPS and stored in our database so we can review and respond to your request. We use this information only for customer support, troubleshooting, and protecting the service (for example, detecting abuse). We retain support records as long as needed to handle your inquiry and for our legitimate support and security purposes, unless applicable law requires otherwise.

**Subscriptions (App Store / Google Play):** If you purchase optional paid features through in-app purchases, **payment processing** and core subscription management are handled by **Apple** and/or **Google** under their terms. We may use a **third-party subscription status service** (for example, to verify purchases, renewals, and cancellations) so we can enable or extend paid entitlements on your device. That service processes data under its own privacy policy; we use it only to deliver what you purchased. We will update this Privacy Policy when offerings change materially.

## 3. Third-Party AI Providers

When you use AI features, your transcript is sent to third-party providers via [OpenRouter](https://openrouter.ai). All requests are routed exclusively through OpenRouter — we do not contact providers directly.

Current providers used via OpenRouter:
- **OpenAI** — summary generation and task extraction
- **Google** (Gemini) — summary generation and task extraction
- **Meta** (Llama) — summary generation and task extraction
- **DeepSeek** (DeepSeek) — summary generation and task extraction
- **Mistral** (Mistral) — summary generation and task extraction

We apply **Zero Data Retention (ZDR)** to every request: routing goes only to endpoints where providers do not store your data or use it for model training. OpenRouter's ZDR policy is described [here](https://openrouter.ai/docs/guides/features/zdr).

## 4. No Accounts or Login

Voice Inbox AI does not require an account or login. There is no user registration. We do not ask for your name or a password. If you **voluntarily** include an email address in an in-app support request, we process it only to communicate with you about that request (see “In-app support” above).

## 5. Data Storage

**On your device:** recordings, transcripts, and AI-generated content are stored until you delete them or uninstall the app.

**On our servers:** AI results are stored for up to 1 hour, then automatically deleted. Per-device rate limit counters are stored for up to 8 days, then reset. Push tokens are stored for up to 30 days and refreshed on every app launch with notifications enabled. **Support requests** (including optional contact details and diagnostics you send through the support form) are stored in our database as described in section 2. **Subscription and billing records** needed to verify in-app purchases (for example, device identifier and entitlement expiry) are stored as long as needed to provide paid features and prevent abuse.

## 6. Your Rights

You retain full control over your data. You have the right to:

- **Access** — all your data is stored locally and available at any time.
- **Delete** — you can delete individual recordings or all app data via settings or by uninstalling the app.
- **Export** — data can be exported from the app at any time.
- **Opt out of AI processing** — you may use the app with offline transcription only and never send data to our servers.
- **Object to processing** — if you have questions about data handling, contact us at the email below.
- **Support data** — for information you submitted through in-app support, you may contact us using the address below to ask questions or request deletion where applicable law allows.

## 7. Security

All communication with our API uses HTTPS encryption. API requests are authenticated with short-lived tokens tied to your device; we do not store these tokens. The app supports optional device lock (PIN or biometrics) to protect access to your data.

## 8. Children

Voice Inbox AI is not intended for children under 13. We do not knowingly collect data from children. If you become aware that a child is using the app, please contact us.

## 9. Changes

We may update this Privacy Policy from time to time. The "Last updated" date at the top reflects any changes. We will notify you of material changes via push notification or upon the next app launch.

## 10. Contact

Privacy inquiries: **mkandratsyeu@gmail.com**
