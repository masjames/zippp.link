---
id: STORY-101
type: story
title: End-to-end device test
status: blocked
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: ["DIR-001", "DEC-005"]
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# What it is

**Parked.** Companion-era E2E (pair → Terima → credit). The gate that matters is **STORY-102** under DIR-001.

# Goal

Kept only as historical checklist if someone still validates the spike. Do not block Space work on this card.

# Context

- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` sections 4, 6, and 7.
- `spec/themes/02-android-telegram-pivot/android-rollout-plan.md` Lane F.
- `spec/themes/03-zippp-software-factory/zippp-context-for-claude.md` section 19.

# Acceptance criteria

- [ ] Pair the test APK with an 8-character code from web Settings.
- [ ] Capture a real receipt and receive extraction with a server scan id.
- [ ] Review the card and tap Terima.
- [ ] Confirm the expected rows appear in the Sheet.
- [ ] Confirm exactly one credit is spent and no credit is spent on Buang.
- [ ] Record every failure with device, app version, scan id, and error code.

# Verification

- Manual: run the test on a real device against Preview.
- Static trace ID: not required for this manual test.
- Production: none. Mobile is dark in Production.

# Out of scope

- Automated device farm coverage.
- Production enablement. FEAT-110 owns that gate.
- New Android features.

# Definition of done

The full path works on a real device, the Sheet row is correct, the credit decrement is correct, and the result is recorded in this entity.

# Notes

Pairing already succeeded on Preview. Capture, review, and append are not yet confirmed end to end.
