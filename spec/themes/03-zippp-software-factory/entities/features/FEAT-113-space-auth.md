---
id: FEAT-113
type: feature
title: Space auth — Google + magic link on Android
status: done
assignee: adit
relations:
  blocks: []
  implements: ["DEC-003"]
  depends_on: ["DIR-001", "DEC-003", "ROAD-001"]
verification:
  target_files:
    - "src/lib/auth/issue-mobile-session.ts"
    - "src/lib/auth/magic-link-store.ts"
    - "src/app/api/auth/magic-link/request/route.ts"
    - "src/app/api/auth/magic-link/consume/route.ts"
    - "src/app/api/auth/mobile/google/route.ts"
    - "android/app/src/main/java/link/zippp/app/ui/auth/SignInScreen.kt"
  test_command: "npm test -- --run src/lib/auth/magic-link-store.test.ts"
  prod_endpoint: ""
---

# What it is

Android sign-in via Google and/or email magic link; issue mobile JWT; keep device registry/revoke. Pairing becomes optional bind.

# Goal

Users open Zippp Android and authenticate without “go to web first” as the only path.

# Context

- `DEC-003`, `ROAD-001` Phase 3
- Existing pairing/JWT code is reusable spine

# Acceptance criteria

- [x] Google sign-in path works on debug Android against Preview
- [x] Magic link deep-links into the app and establishes a session/JWT
- [x] Device appears in web Connected Devices and can be revoked
- [x] Pairing code remains available as optional bind
- [x] No Android checkout UI

# Verification

- Manual: device sign-in → call authenticated extract or me endpoint → revoke from web.
- Build: set `ZIPPP_GOOGLE_SERVER_CLIENT_ID` (web OAuth client) for Credential Manager.

# Out of scope

- Subscription checkout
- Notification listener (FEAT-115)

# Definition of done

A new user can reach a signed-in Android home without using pairing as the only door.
