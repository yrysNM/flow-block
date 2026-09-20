# Flow Block Mobile

Android phone-level blocker (Expo). Companion to the Chrome extension in the repo root.

| | Chrome extension (`/`) | This app (`/mobile`) |
|---|---|---|
| Blocks sites inside Chrome | Yes | No |
| Blocks domains on the whole phone | No | Yes (local VPN/DNS, after native module) |
| Active-tab time tracking | Yes | No (optional Usage Stats later) |
| Trusted Accept / Denied | Same Chrome profile | HTTPS link (cross-phone with a backend) |
| Ship as `.apk` | No | Yes (`eas build`) |

## What works today

- Add / enable / lock domains (same trusted-unlock rules as the extension)
- Blocked screen + share unlock link
- Unlock Accept / Denied UI (on-device storage; cross-phone needs a hosted API)
- VPN filter **JS API** that calls native `FlowBlockVpn` when present
- EAS profiles for development / preview APK

## What does not work in Expo Go

Local VPN, Accessibility, and Usage Stats need a **development build**:

```bash
cd mobile
npm install
npx expo prebuild -p android
# implement android VpnService — see src/vpn/NATIVE.md
npx eas build -p android --profile preview
```

Until the native module exists, the app UI runs and Protection shows “Needs a native VPN build”.

## Scripts

```bash
cd mobile
npm start                 # Expo (UI only in Expo Go)
npm run android           # open Android
npm run prebuild          # generate android/ for native VPN
npm run build:apk         # eas preview APK (requires eas login + projectId)
```

## Architecture

```text
mobile/src/
├── screens/        Home, add site, detail, blocked, unlock, settings
├── storage.ts      AsyncStorage settings + unlock requests
├── domain.ts       Hostname normalize / match (ported from extension)
├── vpn/
│   ├── VpnFilter.ts   JS bridge → FlowBlockVpn
│   └── NATIVE.md      How to implement Android VpnService
└── navigation/     Deep links: flowblock://unlock?token=…
```

## Trusted unlock

Share URLs like `https://your-host/unlock?token=…`.

1. Set **Trusted unlock base URL** in Settings
2. Wire a small backend that stores decisions and pushes/syncs to the phone
3. Until then, Accept/Denied only updates **this device’s** AsyncStorage

## iOS

Apple will not let an Expo app control Safari the way this extension controls Chrome. Prefer Screen Time / Family Controls for whole-device limits.
