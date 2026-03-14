# Push Notifications (iOS)

Voice Inbox AI supports push notifications on iOS for:

1. **AI processing complete** — when a recording's AI summary/tasks are ready (app closed or in background)
2. **Policy/terms updates** — notifications about Privacy Policy or Terms changes
3. **Limit warnings** — when weekly AI limit is almost reached

## Setup

### 1. Apple Developer

1. In [Apple Developer](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → **Keys**
2. Create a new key with **Apple Push Notifications service (APNs)** enabled
3. Download the `.p8` file (you can only download it once)
4. Note the **Key ID** and your **Team ID**

### 2. App Identifier

1. In Identifiers → select your app (e.g. `com.mkandratsyeu.voiceinboxai`)
2. Enable **Push Notifications** capability
3. Regenerate provisioning profiles if needed

### 3. Xcode

1. Open `ios/VoiceInboxApp.xcworkspace`
2. Select the project → **Signing & Capabilities**
3. Add **Push Notifications** capability (if not already added)
4. Add **Background Modes** → enable **Remote notifications**

The project already includes:
- `VoiceInboxApp.entitlements` with `aps-environment`
- `remote-notification` in `UIBackgroundModes` (Info.plist)
- AppDelegate configured for push

For **production** (App Store), change `aps-environment` in `VoiceInboxApp.entitlements` from `development` to `production`, or add a separate entitlements file for Release.

### 4. Backend (web)

Add to `.env`:

```
APNS_KEY_ID=your_key_id
APNS_TEAM_ID=your_team_id
APNS_KEY_PATH=path/to/AuthKey_XXXXX.p8
APNS_TOPIC=com.mkandratsyeu.voiceinboxai
```

The `.p8` path is relative to the web project root.

## Flow

1. App launches → requests notification permission (first time)
2. User grants → device token is sent to `POST /api/push/register`
3. Backend stores `deviceId → deviceToken` in Redis
4. When AI processing completes → backend sends APNs push to the stored token
5. User receives notification and can open the app

## Testing

- Push notifications **do not work** on the iOS Simulator
- Use a **physical device** for testing
- Ensure the device has network access
