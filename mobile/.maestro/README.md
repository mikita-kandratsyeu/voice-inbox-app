# Maestro E2E — Voice Inbox (iOS, manual only)

End-to-end UI tests for the React Native app using [Maestro](https://maestro.mobile.dev/). **Not wired to CI** — run locally on the iOS Simulator or a connected device.

## Prerequisites

1. **Xcode** with an iOS Simulator (or physical device).
2. **Dev build** installed: from repo root  
   `yarn workspace voice-inbox-app ios`
3. **Maestro CLI**:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```
   Or: `brew tap mobile-dev-inc/tap && brew install maestro`

App bundle id: `com.mkandratsyeu.voiceinboxai`

## Commands

From `mobile/`:

```bash
# All flows
yarn test:e2e

# Smoke only (P0)
yarn test:e2e:smoke

# Single flow
yarn test:e2e:flow .maestro/flows/smoke/tab-navigation.yaml

# Regenerate catalog flows after editing scripts/generate-maestro-flows.mjs
yarn generate:maestro-flows
```

## E2E mode (dev / internal TestFlight only)

Deep links (handled in app when `__DEV__` or internal build):

| URL | Effect |
|-----|--------|
| `voiceinbox://e2e/reset?skipOnboarding=1&skipAppLock=1&disableAds=1` | Skip gates, mark onboarding done |
| `voiceinbox://e2e/seed-text-note?title=...&body=...` | Insert text note (`e2e-seed-note` by default) |

Subflow `launch-e2e.yaml` clears app state, opens reset link, waits for `e2e.ready` and `inbox.screen`.

Alternative: `skip-onboarding-ui.yaml` walks onboarding UI (no E2E bridge).

## Selectors

Flows use **`testID`** from [`src/shared/e2e/testIds.ts`](../src/shared/e2e/testIds.ts). Do not assert on translated strings.

## Structure

```
.maestro/
  config.yaml          # appId + env vars
  subflows/            # reusable setup (launch, seed, dismiss alerts)
  flows/
    smoke/             # P0 — hand-maintained
    onboarding/        # P1+ — generated + customizable
    ...
```

## Notes

- **Microphone** recording flows may need Simulator mic permission; some steps are `optional: true`.
- **Whisper / purchases / real sync** are out of scope — see plan catalog.
- Rebuild the app after changing `testID` or E2E bridge code.
