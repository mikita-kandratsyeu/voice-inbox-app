# Security Policy

This policy applies to the **Voice Inbox AI** monorepo: the **Next.js** app in `web/` and the **React Native** app in `mobile/`, including their APIs, data handling, and native clients.

## Supported Versions

Security fixes are applied to the **actively maintained** development line. Release tags and store builds may lag behind `main`; we prioritize fixes on the default branch and the **latest published** web deployment and mobile release.

| Scope | Supported with security fixes |
| ----- | ----------------------------- |
| **Current `main` branch** | Yes — primary target for fixes |
| **Latest patch of the current minor** (e.g. `1.2.x` in `web/package.json` and `mobile/package.json`) | Yes, when aligned with what is shipped to users |
| **Older minor lines** (e.g. `1.1.x` and below) | Best effort only; upgrade recommended |
| **Forks and unofficial builds** | Not supported |

Exact version numbers are defined per app in each app’s `package.json`. When in doubt, run the latest code from `main` or install updates from the official app stores / official web deployment.

## Reporting a Vulnerability

**Please do not** open a public GitHub issue for security vulnerabilities — that can put users at risk before a fix exists.

### How to report

1. **Preferred (GitHub):** Use [GitHub Security Advisories](https://github.com/mikita-kandratsyeu/voice-inbox-app/security/advisories/new) to **privately report** a vulnerability for this repository.
2. **Email:** If private reporting is not available, email **Support** at [hello@voice-inbox.online](mailto:hello@voice-inbox.online) with a subject line such as `[Security] Voice Inbox AI`.

Include as much as you can:

- Affected component (`web`, `mobile`, or both) and environment (production, development, specific OS).
- Steps to reproduce, proof-of-concept, or a clear description of the impact.
- Whether you believe the issue is already exploitable in the wild (if known).

### What to expect

- **Acknowledgment:** We aim to acknowledge receipt within **72 hours** (often sooner). If you do not hear back, a short follow-up is welcome.
- **Updates:** We will keep you informed of material progress (triage, fix in progress, release timeline) when a valid report is accepted. Complex issues may take longer; we will communicate delays when practical.
- **If accepted:** We will work on a fix, coordinate disclosure if appropriate, and credit you in release notes or the advisory unless you prefer to remain anonymous.
- **If declined:** We will explain briefly (e.g. out of scope, not reproducible, or accepted risk with rationale).

### Scope (examples)

**In scope:** Authentication and session handling, API abuse, injection, insecure data storage or transit, secrets exposure, dependency vulnerabilities you can tie to exploitable behavior in this project, mobile app sandbox / WebView / deep link issues, and privacy-impacting bugs in how user data is processed.

**Out of scope (generally):** Theoretical issues without a plausible attack path, spam or social engineering against individuals, physical device theft without a product defect, and vulnerabilities in third-party services unless they affect our integration in a fixable way.

### Safe harbor

We will not pursue legal action against researchers who act in **good faith**: avoid privacy violations, degradation of service, or data destruction; do not access or exfiltrate user data beyond what is necessary to demonstrate the issue; and give us reasonable time to remediate before public disclosure.

---

Thank you for helping keep Voice Inbox AI and its users safe.

## Published git history

Client Firebase identifiers previously lived in `GoogleService-Info.plist`. Treat old commits as public. In Google Cloud, restrict the iOS/Android API keys (bundle ID, package name, App Check). Rotate any key that was not meant to be a public client token. Never commit `.env`, `FIREBASE_SERVICE_ACCOUNT`, APNs `.p8`, or `google-services.json`.
