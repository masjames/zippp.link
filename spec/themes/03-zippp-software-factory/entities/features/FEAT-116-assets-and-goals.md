---
id: FEAT-116
type: feature
title: Assets and financial goals
status: todo
assignee: adit
relations:
  blocks: []
  implements: ["DIR-001"]
  depends_on: ["DIR-001", "FEAT-114", "FEAT-115", "ROAD-001"]
verification:
  target_files: []
  test_command: ""
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

- [ ] Add/edit/archive an asset with value and optional notes
- [ ] Add/edit a goal with target amount and progress
- [ ] Visible on web and Android for Space members
- [ ] Wording in `wording.txt`

# Verification

- Manual: create asset + goal on web; see on Android; update progress.

# Out of scope

- Brokerage sync / automatic portfolio pricing
- Bank balance scrape

# Definition of done

Member can manage at least one asset and one goal end-to-end on both surfaces.
