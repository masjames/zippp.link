---
id: FEAT-115
type: feature
title: Notification Listener capture prompt
status: verify
assignee: adit
relations:
  blocks: []
  implements: ["DEC-004"]
  depends_on: ["DIR-001", "DEC-004", "FEAT-113", "ROAD-001"]
verification:
  target_files:
    - "src/app/api/scan/manual/route.ts"
    - "android/app/src/main/java/link/zippp/app/notify/CaptureListener.kt"
    - "android/app/src/main/java/link/zippp/app/ui/manual/ManualEntryScreen.kt"
  test_command: "npm test"
  prod_endpoint: ""
---

# What it is

Opt-in Android Notification Listener. On payment-like notifications, prompt to record in Zippp Space via camera or manual entry. On-device parse; no raw dump upload.

# Goal

Proactive remind — user does not have to remember to open Zippp after paying.

# Context

- `DEC-004`, `ROAD-001` Phase 4
- Play disclosure required before store release

# Acceptance criteria

- [x] User can enable/disable listener in Settings with clear copy
- [x] Payment-like notification shows “Catat di Zippp Space?”
- [x] Camera and manual paths both work from the prompt
- [x] Dismiss does nothing
- [x] No Accessibility service
- [x] Privacy policy / Play declaration notes drafted

# Verification

- Manual: post a test notification from a bank-like package allowlist → prompt → manual save.

# Out of scope

- Auto-book without confirm
- Reading all notification categories on day one

# Definition of done

Prompt path works on a real device with listener enabled.

Implementation note (2026-11-03): opt-in listener, local prompt with Camera and Manual actions, manual entry issues a server scan id through `POST /api/scan/manual` so credits and idempotency behave like a scan. Settings screen checks system notification access and the in-app switch. Compiled with `:app:compileSideloadDebugKotlin`; no device run yet.

Play declaration draft: Notification access is declared and used only to read payment-like text on device. No Accessibility service. No notification content is stored or uploaded. The user must grant access in system settings, and the privacy policy must say the same before store release.
