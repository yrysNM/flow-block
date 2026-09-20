# Native local VPN (Android)

Phone-level blocking does **not** work in Expo Go. You need a development / preview build with a `VpnService` that filters DNS (or packets) for listed domains.

## Why VPN / DNS

| Approach | Blocks Chrome + YouTube app? | Notes |
|---|---|---|
| In-app WebView | No | Only traffic inside your app |
| Accessibility (read browser URL bar) | Fragile | Play Store often rejects |
| Local VPN / DNS filter | Yes | Same pattern as AdGuard / Blokada |
| Usage Stats | App time only | Not `youtube.com` in Chrome |

## Contract expected by JS

Expose a React Native module named `FlowBlockVpn`:

```ts
start(domains: string[]): Promise<{ status: 'running' | 'error'; message?: string }>
stop(): Promise<{ status: 'stopped' | 'error'; message?: string }>
updateDomains(domains: string[]): Promise<void>
getStatus(): Promise<{ status: string; message?: string; blockedDomains?: string[] }>
```

`src/vpn/VpnFilter.ts` calls this when present; otherwise the UI stays usable and shows “unavailable”.

## Suggested Android outline

1. `npx expo prebuild -p android`
2. Add `android.permission.INTERNET` and `BIND_VPN_SERVICE`
3. Implement `android.net.VpnService` that:
   - establishes a local TUN interface (no remote VPN server required)
   - intercepts DNS queries (UDP 53) for listed hostnames / suffixes
   - returns NXDOMAIN or a sinkhole address for blocked domains
   - forwards everything else
4. Register a foreground notification while the VPN is active
5. Bridge methods to JS as `FlowBlockVpn`

You will **not** get full URLs (`/watch?v=…`) — only hostnames at the DNS layer.

## iOS

Apple is much stricter. Screen Time / Family Controls are the realistic path for whole-device limits. Do not expect Safari control like the Chrome extension.

## Build an APK

```bash
cd mobile
npx expo prebuild -p android
npx eas build -p android --profile preview
```

Install the resulting `.apk` on a device, grant VPN permission when prompted, then toggle protection in the app.
