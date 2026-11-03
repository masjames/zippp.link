---
id: FEAT-105
type: feature
title: Sideload OTA
status: todo
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: ["DIR-001"]
verification:
  target_files: ["android/app/src/main/java/link/zippp/app/update/OtaUpdateManager.kt", "src/app/api/app-version/route.ts"]
  test_command: "./android/gradlew -p android :app:assembleDebug"
  prod_endpoint: ""
---

# What it is

A sideload-only update path that reads `/api/app-version`, downloads the APK, verifies SHA-256 and APK signer continuity, and hands the file to PackageInstaller.

# Goal

Keep direct APK installs current without letting a tampered or unsigned APK install.

# Context

- Distribution for Zippp Space Android (`DIR-001`); not a product-direction card.
- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` section 5.2.
- `spec/themes/01-mvp/ARCHITECTURE.md` app version env.
- `spec/themes/02-android-telegram-pivot/android-rollout-plan.md` Lane E.

# Acceptance criteria

- [ ] The `sideload` flavor checks the manifest on launch and on a manual check.
- [ ] The manifest returns version code, version name, download URL, SHA-256, size, release notes, and mandatory.
- [ ] The client verifies SHA-256 before install.
- [ ] The client verifies the APK signer matches the installed app.
- [ ] The client launches PackageInstaller and handles cancel and failure.
- [ ] The `play` flavor ignores the APK URL and uses Play In-App Updates instead.

# Verification

- Static trace ID: `// @implements FEAT-105`
- Target files: `android/app/src/main/java/link/zippp/app/update/OtaUpdateManager.kt`, `src/app/api/app-version/route.ts`
- Test: `./android/gradlew -p android :app:assembleDebug`
- Production: none until the APK is signed and hosted.

# Out of scope

- Play In-App Updates. FEAT-106 owns that.
- A GitHub release pipeline.

# Definition of done

A sideload build detects a newer APK, refuses a bad checksum or signer, and installs a valid APK through PackageInstaller.

# Notes

The manifest route exists. `OtaUpdateManager.kt` does not exist yet.
