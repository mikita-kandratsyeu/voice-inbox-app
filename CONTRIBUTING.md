# Contributing to Voice Inbox AI

Thanks for taking the time to contribute. This is a Yarn 4 + Turborepo monorepo (`web/`, `mobile/`, `telegram-bot/`). Node.js **≥ 24**.

By submitting a pull request, you agree that your contribution is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE) covering this repository. You retain copyright in your contribution; you grant the project the same noncommercial license, plus the right for the copyright holder to relicense your contribution (including commercially) as part of Voice Inbox.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

1. Search [existing issues](https://github.com/mikita-kandratsyeu/voice-inbox-app/issues) and PRs so we do not duplicate work.
2. For security issues, **do not** open a public issue. See [SECURITY.md](SECURITY.md).
3. Keep changes focused. Match existing code style and folder conventions (`.cursor/rules/`).

## Development setup

```bash
git clone https://github.com/YOUR_USER/voice-inbox-app.git
cd voice-inbox-app
yarn install
```

Upstream: [mikita-kandratsyeu/voice-inbox-app](https://github.com/mikita-kandratsyeu/voice-inbox-app).

Copy env templates (never commit real secrets):

```bash
cp mobile/.env.example mobile/.env
cp web/.env.example web/.env
cp telegram-bot/.env.example telegram-bot/.env
```

### Mobile extras

- **iOS:** copy `mobile/ios/VoiceInboxApp/GoogleService-Info.plist.example` to `GoogleService-Info.plist` and replace placeholders with a Firebase iOS app config, **or** download the file from the Firebase console.
- **Android:** copy `mobile/android/app/google-services.json.example` to `google-services.json` (gitignored) from Firebase.
- Xcode, CocoaPods, Android SDK as usual — see [mobile/README.md](mobile/README.md).

Official production Firebase / store keys stay **out of git**. Restrict API keys in Google Cloud (bundle ID / package name, App Check).

### Quality gates

From the repository root:

```bash
yarn lint
yarn type:check
yarn test
# or the full local CI suite:
yarn ci
```

App-only: `yarn turbo run lint type:check test --filter=voice-inbox-app` (or `voice-inbox-web` / `voice-inbox-telegram-bot`).

## Pull requests

- Branch from `main`. One concern per PR when practical.
- Fill in `.github/PULL_REQUEST_TEMPLATE.md`.
- Include tests for logic changes.
- Do not commit `.env`, `*.p8`, `*.pem`, `google-services.json`, production `GoogleService-Info.plist`, keystores, or dump files.
- Do not add `[skip ci]` unless a maintainer asked you to.

## Issue reports

Use the GitHub issue templates. Include app (`mobile` / `web` / `telegram-bot`), version, OS, and steps to reproduce.

## Maintainers

Default review: see [`.github/CODEOWNERS`](.github/CODEOWNERS).
