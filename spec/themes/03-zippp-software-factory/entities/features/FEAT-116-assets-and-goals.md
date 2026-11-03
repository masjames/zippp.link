---
id: FEAT-116
type: feature
title: Assets and financial goals
status: verify
assignee: adit
relations:
  blocks: []
  implements: ["DIR-001"]
  depends_on: ["DIR-001", "FEAT-114", "FEAT-115", "ROAD-001"]
verification:
  target_files:
    - "src/lib/space/ledger-store.ts"
    - "src/app/api/spaces/[spaceId]/assets/route.ts"
    - "android/app/src/main/java/link/zippp/app/ui/space/SpaceScreen.kt"
  test_command: "npm test"
  prod_endpoint: ""
---

# What it is

Track assets and financial goals inside a Zippp Space (web + Android).

# Goal

Zippp is a finance OS, not only a receipt inbox.

# Context

- `DIR-001`, `ROAD-001` Phase 5
- Starts after capture loop is real

# Acceptance criteria

- [x] Add/edit/archive an asset with value and optional notes
- [x] Add/edit a goal with target amount and progress
- [x] Visible on web and Android for Space members
- [x] Wording in `wording.txt`

# Verification

- Manual: create asset + goal on web; see on Android; update progress.

# Out of scope

- Brokerage sync / automatic portfolio pricing
- Bank balance scrape

# Definition of done

Member can manage at least one asset and one goal end-to-end on both surfaces.

Implementation note (2026-11-03): `ledger-store.ts` holds assets and goals per Space with archive, validation, and an Upstash hash plus in-memory test fallback. Web manages them on the Space settings page; Android has a Space screen with add, edit, and archive. Five store tests cover validation, scoping, archive, and partial updates. Compiled with `:app:compileSideloadDebugKotlin`; no device or browser run yet.
