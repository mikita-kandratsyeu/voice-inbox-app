# Privacy Policy

**Last updated: March 2025**

Voice Inbox ("we", "our", or "the app") is an offline-first voice notes application. This Privacy Policy explains how we handle your data when you use the mobile app and our optional web API for AI processing.

## 1. Data We Process

Voice recordings, transcripts, summaries, tasks, and tags are stored locally on your device. We do not have access to this data unless you explicitly use AI features that send data to our servers.

When you use AI features (summaries, task extraction, Ask AI), the app sends your transcript text to our web API over HTTPS. The transcript is forwarded to third-party AI providers (e.g., OpenRouter, Google, OpenAI) to generate results. We do not store transcripts on our servers.

## 2. Our Web API

Our API temporarily stores only the AI output (summary, tasks, tags) in a key-value store with a 1-hour expiration. After one hour, this data is automatically deleted. We never store transcripts permanently.

We use a device identifier (device ID) to enforce a weekly limit on free AI requests per device. This identifier is used only for rate limiting and is not linked to your identity.

## 3. Third-Party AI Providers

When you use AI features, your transcript is sent to AI providers via [OpenRouter](https://openrouter.ai). We enforce **Zero Data Retention (ZDR)** on every request: we only route to endpoints where providers do not store your data. Under ZDR, providers neither retain nor train on your transcripts. OpenRouter's ZDR policy is documented [here](https://openrouter.ai/docs/guides/features/zdr).

## 4. No Accounts, No Login

Voice Inbox does not require an account or login. There is no user registration, and we do not collect personal information such as names, emails, or passwords.

## 5. Data Retention

**On your device:** Recordings, transcripts, and AI-generated content remain until you delete them or uninstall the app.

**On our servers:** AI results are stored for up to 1 hour, then automatically deleted. Device-based rate limit counters are stored for up to 8 days, then reset.

## 6. Your Rights

You can export or delete all your data from the app at any time. AI processing is optional—you can use the app with offline transcription only and never send data to our servers.

## 7. Security

All communication with our API uses HTTPS encryption. The app supports an optional device lock (PIN or biometrics) to protect access to your data on the device.

## 8. Children

Voice Inbox is not directed at children under 13. We do not knowingly collect data from children.

## 9. Changes

We may update this Privacy Policy from time to time. The "Last updated" date at the top will reflect any changes. Continued use of the app after changes constitutes acceptance.

## 10. Contact

For privacy-related questions, contact us at the support email provided in the app settings.
