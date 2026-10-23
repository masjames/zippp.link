---
id: FEAT-110
type: feature
title: Enable mobile in Production
status: blocked
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: [STORY-101]
verification:
  target_files: ["src/lib/mobile/config.ts", "src/app/api/app-version/route.ts"]
  test_command: "npm test"
  prod_endpoint: ""
---

# What it is

The production enablement gate for the Android companion: set `MOBILE_API_ENABLED` and `MOBILE_JWT_SECRET` only after the end-to-end device test passes.

# Goal

Turn on the mobile API in Production with a proven capture-to-Sheet path and a clear rollback.

# Context

- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` section 4.
- `spec/themes/03-zippp-software-factory/zippp-context-for-claude.md` section 19.
- `spec/themes/02-android-telegram-pivot/android-rollout-plan.md`.

# Acceptance criteria

- [ ] STORY-101 passes on a real device and a real Sheet.
- [ ] `MOBILE_API_ENABLED=true` is set in Production.
- [ ] `MOBILE_JWT_SECRET` is at least 32 bytes and set in Production.
- [ ] Pairing, extract, append, and revoke are smoke-tested on Production.
- [ ] The web device UI is visible only when mobile is enabled.
- [ ] A rollback removes the flag and the secret and returns 404 on mobile routes.

# Verification

- Static trace ID: `// @implements FEAT-110`
- Target files: `src/lib/mobile/config.ts`, `src/app/api/app-version/route.ts`
- Test: `npm test`
- Production: a manual smoke after the flag is on. Do not set a prod endpoint while mobile is dark.

# Out of scope

- New mobile features.
- Play Store submission.

# Definition of done

Production mobile is on, the main path works, and the rollback has been rehearsed.

# Notes

This task is blocked by STORY-101. Mobile is dark in Production today.
