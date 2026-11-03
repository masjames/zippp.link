---
id: FEAT-108
type: feature
title: Offline queue and EXIF stripping
status: todo
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: ["DIR-001"]
verification:
  target_files: ["android/app/src/main/java/link/zippp/app/data/ApiClient.kt", "android/app/src/main/java/link/zippp/app/data/OfflineQueue.kt"]
  test_command: "./android/gradlew -p android :app:assembleDebug"
  prod_endpoint: ""
---

# What it is

A durable capture queue that survives a network drop, plus EXIF stripping before any image leaves the device.

# Goal

Let a person keep capturing when the network is weak without leaking location or device metadata.

# Context

- `DIR-001` capture reliability on Android.
- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` sections 7 and 9.
- `spec/themes/02-android-telegram-pivot/android-rollout-plan.md` Lane F.

# Acceptance criteria

- [ ] A capture is queued locally before upload.
- [ ] The queue survives app restart.
- [ ] Upload retries with backoff and never duplicates a scan.
- [ ] EXIF is stripped before the image leaves the device.
- [ ] A queued item can be discarded before confirm (no spend applied).
- [ ] No token or image bytes are written to logs.

# Verification

- Static trace ID: `// @implements FEAT-108`
- Target files: `android/app/src/main/java/link/zippp/app/data/ApiClient.kt`, `android/app/src/main/java/link/zippp/app/data/OfflineQueue.kt`
- Test: `./android/gradlew -p android :app:assembleDebug`
- Production: none while mobile is dark.

# Out of scope

- Background upload while the app is closed.
- A zippp-hosted image history.

# Definition of done

A capture taken offline is still reviewable after restart, uploads once when the network returns, and contains no EXIF data.

# Notes

`OfflineQueue.kt` does not exist yet. The current API client uploads directly.
