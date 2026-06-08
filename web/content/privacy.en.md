# Privacy Policy

**Last updated: June 2026**

Voice Inbox AI ("we", "our", or "the app") is an offline voice notes application. This Privacy Policy explains how we handle your data when you use the mobile app, the optional web API for AI processing, optional in-app support requests, and optional sign-ups on our website (such as the Android waitlist).

## 1. Data We Process

Voice recordings, transcripts, summaries, tasks, and tags are stored locally on your device. We have no access to this content unless a feature you use sends it to our servers (for example **cloud AI**, push notifications, or in-app support).

**On-device AI (optional):** The app may offer **Private mode** that runs summaries, task extraction, and Ask AI **on your device** using a language model you download. In that mode, transcript text for those features is **not** sent to our servers for model inference. Downloading a model requires an internet connection and may retrieve weight files from a **public model host** (for example, Hugging Face). That host processes a normal file download and does not receive your note transcripts from us.

**Cloud AI:** If you use AI in the Smart mode, or when on-device AI is unavailable and the app uses the cloud instead, the app sends transcript text to our web API over HTTPS. The transcript is forwarded to third-party AI providers via the OpenRouter platform. We do not store transcripts on our servers.

**Product analytics (Firebase Analytics):** The app may collect basic product analytics events (for example, screen views and feature usage events) via Firebase Analytics to help us improve app quality and UX. We do not use this for cross-app advertising profiles on our behalf.

**Crash reporting (Firebase Crashlytics):** In **release** builds, the app may send crash and stability diagnostics to [Google Firebase Crashlytics](https://firebase.google.com/products/crashlytics) so we can find and fix defects. In development/debug builds, crash collection is disabled by default and can be enabled only through explicit debug configuration. We may set an anonymous app-specific device identifier in Crashlytics (the same value used for API access and rate limiting — see “Our Web API” below) so we can relate a support request to crash logs when you contact us. Crashlytics is operated under Google’s terms and policies.

**Advertising (Yandex Mobile Ads):** *As of the “Last updated” date above*, unless you have an active subscription or purchase that removes advertising, the app may use **Yandex Mobile Ads** — a banner on the note detail screen, optional full-screen (interstitial) ads after certain completed actions (such as saving a note, importing records, or applying suggested folder changes), and an optional rewarded ad that can grant bonus AI quota. We limit how often interstitials can appear. Where required by law, we will provide consent or controls as applicable. The ad SDK operates under Yandex’s policies; we use it only to serve ads, not for cross-app tracking or analytics on our behalf.

**Website — Android waitlist (optional):** If you join the Android release waitlist through our website (for example via an embedded or linked form operated by a third-party form provider), you may provide your **name**, **email address**, and optionally your **Android phone model** and responses to short questions (such as whether you currently use an iOS device). For details about our privacy practices and how we protect your data in this context, this section and our contact details below apply alongside the rest of this Policy.

We use waitlist information only to **operate the waitlist**, **invite you to Android beta or early access** when available, and send **occasional email updates** about Voice Inbox AI (product news relevant to the Android release and the app). We **do not** sell your personal data or share it with third parties for unrelated marketing. The form provider processes submissions under its own terms; we access responses only to deliver the purposes above.

You may **contact us** at **hello@voice-inbox.online** to ask questions about this processing or to **request removal from the waitlist** where applicable law allows. Marketing-style emails include an unsubscribe link where required.

## 2. Our Web API

Our API temporarily stores AI outputs (for example summaries, tasks, tags, and Ask AI answers) in a short-lived key-value cache. Entries expire automatically after a time-to-live you choose in the app’s Smart mode AI settings (between **5 minutes** and **1 hour**; **1 hour** is the default). That preference is stored only on your device and sent with each request; we do not keep a separate server-side profile of it. Each time the server updates a job’s status, the expiry is refreshed from that moment. We never store transcripts permanently.

Access to the API is authenticated using short-lived tokens that are bound to your device ID. We do not store these tokens on our servers; they are validated and then discarded. We use the device identifier to enforce **weekly AI credit limits** per device (for free and paid tiers as applicable) and for authentication. This identifier is used solely for rate limiting, purchase verification, and authentication and is not linked to your identity.

**AI credit usage:** When cloud AI features consume credits, we maintain a **per-device usage ledger** in our database (for example, operation type, credit amount, and timestamp). The app may show you a history of credits spent, bonuses, refunds, and limit restorations. This ledger does not include your note transcripts.

If you enable push notifications, we store your push token (FCM) and app language on our servers. This data is used solely to send you notifications about completed AI processing and important updates. The push token is stored for 30 days and refreshed on every app launch. You can revoke notification permission at any time in your device’s system settings (e.g. iOS Settings or Android app notification settings).

**In-app support:** If you use the “Contact support” flow, you may send us a description of the issue and, optionally, your email (so we can reply), a short subject, and any extra text you choose to paste (for example, an error message). The app also attaches a **technical diagnostics** package (such as app version, OS version, device model, memory/disk hints, network type, locale, timezone, an app-specific device identifier already used for API access — see above, and whether Firebase Crashlytics collection is enabled and whether the previous app session ended in a crash). These submissions are transmitted over HTTPS and stored in our database so we can review and respond to your request. We use this information only for customer support, troubleshooting, and protecting the service (for example, detecting abuse). We retain support records as long as needed to handle your inquiry and for our legitimate support and security purposes, unless applicable law requires otherwise.

**Subscriptions and in-app purchases (App Store / Google Play):** If you purchase optional paid features through in-app purchases, **payment processing** and core subscription management are handled by **Apple** and/or **Google** under their terms. We may use a **third-party subscription status service** (for example, to verify purchases, renewals, and cancellations) so we can enable or extend paid entitlements on your device. That service processes data under its own privacy policy; we use it only to deliver what you purchased.

If you buy an optional **one-time limit restoration** as a Pro subscriber, we verify the purchase through the same or related in-app purchase services and store a **record of the transaction** (for example, your device identifier, the store transaction identifier, the product identifier, and how many credits were restored) so we can apply the restoration once, show it in your usage history, and prevent duplicate use of the same purchase. We do not receive your payment card details.

We will update this Privacy Policy when offerings change materially.

## 3. Third-Party AI and Model Distribution

**Cloud AI via OpenRouter:** When AI runs in the cloud, your transcript is sent to third-party model providers through [OpenRouter](https://openrouter.ai). We route those requests exclusively through OpenRouter — we do not call those providers’ APIs directly. Models we may use for your requests include:

- **Google** (Gemini family) — summaries, task extraction, Ask AI
- **OpenAI** (GPT-5.4 family, including Nano) — summaries, task extraction, Ask AI (including for short transcripts in **Auto** mode)
- **DeepSeek** — summaries, task extraction, Ask AI (including as a fallback when another model fails)
- **MiniMax** — summaries, task extraction, Ask AI
- **Xiaomi** (MiMo) — summaries, task extraction, Ask AI
- **NVIDIA** (Nemotron) — summaries, task extraction, Ask AI

We may add or change models over time; the in-app model picker reflects what you can select for cloud mode. If you choose **Auto** in cloud AI settings, our servers select a model based on request characteristics (such as transcript length): shorter transcripts may use **OpenAI GPT-5.4 Nano**, medium-length transcripts **DeepSeek**, and longer transcripts **Google Gemini**; otherwise we use the model you pick.

We apply **Zero Data Retention (ZDR)** to **cloud** requests where supported: routing prefers endpoints where providers do not retain your content for training. For **OpenAI GPT-5.4** models, ZDR-compatible endpoints on OpenRouter may be unavailable or unreliable; those requests may route through standard OpenAI endpoints instead (see OpenRouter and OpenAI data policies). Other models continue to use ZDR routing when available. OpenRouter's ZDR policy is described [here](https://openrouter.ai/docs/guides/features/zdr).

**On-device models:** Private mode downloads open-weight model files from third-party hosts (for example, Hugging Face). We do not receive your transcripts when you use on-device inference.

## 4. No Accounts or Login

Voice Inbox AI does not require an account or login inside the app. There is no in-app user registration, and we do not ask for your name or a password in the app. If you **voluntarily** include an email address in an in-app support request, we process it only to communicate with you about that request (see “In-app support” above).

**Website waitlist:** Separately, if you **choose** to join our Android waitlist on the website, you may voluntarily provide your name, email, and other fields described under “Website — Android waitlist” in section 1. That is optional and independent of using the mobile app.

## 5. Data Storage

**On your device:** recordings, transcripts, and AI-generated content are stored until you delete them or uninstall the app.

**On our servers:** Temporary AI job results in our key-value cache are retained until they expire (up to one hour by default; the app may request as little as five minutes, as described in section 2). Per-device **weekly usage counters** for AI credits are stored in a short-lived key-value store for up to 8 days, then reset. **AI credit ledger entries** and **records of one-time limit-restoration purchases** are stored in our database for as long as needed to show your usage history, provide paid features, and prevent abuse (including reuse of the same store transaction). Push tokens are stored for up to 30 days and refreshed on every app launch with notifications enabled. **Support requests** (including optional contact details and diagnostics you send through the support form) are stored in our database as described in section 2. **Subscription and other in-app purchase records** needed to verify entitlements (for example, device identifier, entitlement expiry, and store transaction identifiers) are stored as long as needed for those purposes. **Android waitlist** submissions are retained as long as needed to run the waitlist and send related emails, unless you ask us to delete your entry or applicable law requires otherwise.

## 6. Your Rights

You retain full control over your data. You have the right to:

- **Access** — all your data is stored locally and available at any time.
- **Delete** — you can delete individual recordings or all app data via settings or by uninstalling the app.
- **Export** — data can be exported from the app at any time.
- **Opt out of cloud AI processing** — you may use offline transcription only, use on-device private AI so transcripts are not sent to our servers for inference, or avoid AI features entirely.
- **Object to processing** — if you have questions about data handling, contact us at the email below.
- **Support data** — for information you submitted through in-app support, you may contact us using the address below to ask questions or request deletion where applicable law allows.
- **Waitlist data** — for information you submitted through the website Android waitlist, contact us using the address below to ask questions or request removal or deletion where applicable law allows.

## 7. Security

All communication with our API uses HTTPS encryption. API requests are authenticated with short-lived tokens tied to your device; we do not store these tokens. The app supports optional device lock (PIN or biometrics) to protect access to your data.

## 8. Children

Voice Inbox AI is not intended for children under 13. We do not knowingly collect data from children. If you become aware that a child is using the app, please contact us.

## 9. Changes

We may update this Privacy Policy from time to time. The "Last updated" date at the top reflects any changes. We will notify you of material changes via push notification or upon the next app launch.

## 10. Contact

Privacy inquiries: **hello@voice-inbox.online**
