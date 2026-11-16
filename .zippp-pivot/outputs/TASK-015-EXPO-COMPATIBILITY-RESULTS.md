# TASK-015 — Expo compatibility spike results

**Status:** Web verified; Android/iOS verification pending on the owner's Mac. This is an isolated compatibility spike, not a completed React Native migration.

## Scope delivered

- Added `apps/expo-compat/` as a separate Expo Router app. The existing Next.js web app, Kotlin Android app, and backend were left in place.
- Rendered one shared React Native screen through Expo Router.
- Used Expo SDK `~58.0.25` and Node `22.23.5`; Expo SDK's declared Node engine does not include this workspace's Node 23 runtime.

## Verification

| Check | Result |
|---|---|
| `npx expo install --check` | Passed: dependencies are up to date |
| `npm run typecheck` | Passed |
| `npm run export:web` | Passed; static export includes `/`, `/_sitemap`, and `/+not-found` |
| Browser at `http://127.0.0.1:4174/` | Passed; `zippp`, `Expo Router`, and `React Native for web` rendered; no browser console errors |
| Android/iOS native builds | Not run; deferred to owner's Mac |

During setup, Expo reported TypeScript `~6.0.3` as the SDK-compatible version; the isolated app was aligned to it. The first web export lacked `react-native-web`; adding Expo SDK-compatible web peers resolved that failure. A package-install invocation also emitted a CLI helper resolution error after dependency installation; subsequent dependency check, TypeScript check, and web export all passed.

## Limits and next step

This proves the Expo/React Native screen can be statically exported for web. It does not prove Android/iOS builds, authentication, camera, storage, Google integration, ledger behavior, or production readiness. It does not authorize replacing or retiring Next.js/Kotlin clients or changing production routing.

On the owner's Mac, run `npm ci`, `npx expo run:android`, and `npx expo run:ios` from `apps/expo-compat/` to complete P2.1 platform verification. Keep the existing clients untouched until migration and parity are separately approved.
