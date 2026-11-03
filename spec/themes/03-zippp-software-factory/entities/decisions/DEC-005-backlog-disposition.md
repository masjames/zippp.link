---
id: DEC-005
type: decision
title: Old backlog — keep, reshape, or park
status: done
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: ["DIR-001", "DEC-002", "DEC-003", "DEC-004"]
verification:
  target_files: []
  test_command: ""
  prod_endpoint: ""
---

# Locked call

Companion-era cards do not drive the product. They are **reshape**, **keep under new DIR**, or **park**.

# Why

Leaving FEAT-102…112 as-is makes the Kanban lie about where we are going.

# Locked

| Card | Disposition |
|---|---|
| FEAT-102 review contract | **Reshape** under personal finance review (still needed) |
| FEAT-103 photo proof | **Keep** as Space receipt proof |
| FEAT-104 month tabs | **Reshape** toward Space spend views |
| FEAT-105 / 106 OTA + Play IAU | **Keep** (distribution) |
| FEAT-107 QR + steady | **Reshape** — QR optional bind; steady camera still useful |
| FEAT-108 offline + EXIF | **Keep** |
| FEAT-109 rollout sync | **Park** — rewrite after ROAD-001 |
| FEAT-110 prod mobile enable | **Blocked** until new E2E story under DIR-001 |
| FEAT-112 full app + auth | **Reshape** — owned by DEC-003; re-groom |
| STORY-101 device E2E | **Reshape** — prove Space capture path, not companion-only |
| Kitchen / sales / reimburse templates as ICP | **Park** — not the product |

# Non-goals

- Deleting git history or instantly deleting every old file
- Implementing all reshape work in one sitting

# Done when

Task cards that fight DIR-001 are `blocked` or rewritten; Direction tab is the source of truth.
