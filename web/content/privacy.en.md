# Privacy Policy

**Last updated: March 2026**

Voice Inbox AI ("we", "our", or "the app") is an offline voice notes application. This Privacy Policy explains how we handle your data when you use the mobile app and the optional web API for AI processing.

## 1. Data We Process

Voice recordings, transcripts, summaries, tasks, and tags are stored locally on your device. We have no access to this data unless you use AI features that send data to our servers.

When using AI features (summaries, task extraction, Ask AI), the app sends transcript text to our web API over HTTPS. The transcript is forwarded to third-party AI providers via the OpenRouter platform to generate results. We do not store transcripts on our servers.

The app does not use any analytics SDKs, advertising trackers, or user behavior monitoring tools.

## 2. Our Web API

Our API temporarily stores only the AI result (summary, tasks, tags) in a key-value store that expires after 1 hour. After one hour, this data is automatically deleted. We never store transcripts permanently.

We use a device identifier (device ID) to limit the number of free AI requests per week per device. This identifier is used solely for rate limiting and is not linked to your identity.

If you enable push notifications, we store your push token (APNS device token) and app language on our servers. This data is used solely to send you notifications about completed AI processing and important updates. The push token is stored for 30 days and refreshed on every app launch. You can revoke notification permission at any time through iOS Settings.

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

Voice Inbox AI does not require an account or login. There is no user registration, and we do not collect personal data (names, emails, passwords).

## 5. Data Storage

**On your device:** recordings, transcripts, and AI-generated content are stored until you delete them or uninstall the app.

**On our servers:** AI results are stored for up to 1 hour, then automatically deleted. Per-device rate limit counters are stored for up to 8 days, then reset. Push tokens are stored for up to 30 days and refreshed on every app launch with notifications enabled.

## 6. Your Rights

You retain full control over your data. You have the right to:

- **Access** — all your data is stored locally and available at any time.
- **Delete** — you can delete individual recordings or all app data via settings or by uninstalling the app.
- **Export** — data can be exported from the app at any time.
- **Opt out of AI processing** — you may use the app with offline transcription only and never send data to our servers.
- **Object to processing** — if you have questions about data handling, contact us at the email below.

## 7. Security

All communication with our API uses HTTPS encryption. The app supports optional device lock (PIN or biometrics) to protect access to your data.

## 8. Children

Voice Inbox AI is not intended for children under 13. We do not knowingly collect data from children. If you become aware that a child is using the app, please contact us.

## 9. Changes

We may update this Privacy Policy from time to time. The "Last updated" date at the top reflects any changes. We will notify you of material changes via push notification or upon the next app launch.

## 10. Contact

Privacy inquiries: **mkandratsyeu@gmail.com**
