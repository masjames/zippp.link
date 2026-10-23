---
id: FEAT-107
type: feature
title: QR pairing scanner and steady detection
status: todo
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: ["android/app/src/main/java/link/zippp/app/ui/pairing/PairingScreen.kt", "android/app/src/main/java/link/zippp/app/ui/camera/CameraScreen.kt"]
  test_command: "./android/gradlew -p android :app:assembleDebug"
  prod_endpoint: ""
---

# What it is

A QR scanner on the Android pairing screen and steady detection on the capture screen, with a manual 8-character fallback.

# Goal

Make pairing faster and reduce blurry receipt captures.

# Context

- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` section 4.1 and section 7.
- `spec/themes/02-android-telegram-pivot/android-rollout-plan.md` Lane F.

# Acceptance criteria

- [ ] The pairing screen scans the QR payload from web Settings.
- [ ] The manual 8-character code remains available.
- [ ] The camera shows a steady indicator.
- [ ] Auto-snap is on by default and can be disabled.
- [ ] A blurry frame is blocked before extraction.
- [ ] No purchased scanning behavior is added.

# Verification

- Static trace ID: `// @implements FEAT-107`
- Target files: `android/app/src/main/java/link/zippp/app/ui/pairing/PairingScreen.kt`, `android/app/src/main/java/link/zippp/app/ui/camera/CameraScreen.kt`
- Test: `./android/gradlew -p android :app:assembleDebug`
- Production: none while mobile is dark.

# Out of scope

- A new pairing protocol.
- Server-side QR generation changes.

# Definition of done

A person can pair by scanning the web QR or typing the code, and the camera blocks blurry frames.

# Notes

The manual pairing screen exists. QR scanning and steady detection do not.
