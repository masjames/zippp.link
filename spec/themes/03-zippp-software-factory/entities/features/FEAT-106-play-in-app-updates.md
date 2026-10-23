---
id: FEAT-106
type: feature
title: Play In-App Updates
status: todo
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: ["android/app/build.gradle.kts", "android/app/src/play/java/link/zippp/app/update/PlayUpdates.kt"]
  test_command: "./android/gradlew -p android :app:assembleDebug"
  prod_endpoint: ""
---

# What it is

Play In-App Updates for the `play` flavor only. The Play build must never download or install a GitHub APK.

# Goal

Keep Play-distributed installs current without violating Play distribution policy.

# Context

- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` section 5.1.
- `spec/themes/02-android-telegram-pivot/android-rollout-plan.md` Lane E.

# Acceptance criteria

- [ ] The `play` flavor uses the Play In-App Updates API.
- [ ] The `play` flavor has no GitHub APK download path and no REQUEST_INSTALL_PACKAGES permission.
- [ ] An immediate update starts when available.
- [ ] A flexible update downloads in the background and completes on restart.
- [ ] The `sideload` flavor is unchanged.

# Verification

- Static trace ID: `// @implements FEAT-106`
- Target files: `android/app/build.gradle.kts`, `android/app/src/play/java/link/zippp/app/update/PlayUpdates.kt`
- Test: `./android/gradlew -p android :app:assembleDebug`
- Production: none until the Play build is submitted.

# Out of scope

- Sideload OTA. FEAT-105 owns that.
- Play data safety submission.

# Definition of done

A Play build offers an immediate or flexible update through Play and cannot install a GitHub APK.

# Notes

The flavor split exists. The Play update code does not exist yet.
