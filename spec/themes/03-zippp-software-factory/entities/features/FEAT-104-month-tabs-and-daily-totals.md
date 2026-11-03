---
id: FEAT-104
type: feature
title: Month tabs and daily totals
status: todo
assignee: adit
relations:
  blocks: []
  implements: ["DIR-001"]
  depends_on: ["DIR-001", "DEC-005"]
verification:
  target_files: ["src/lib/google/sheet-layout.ts", "src/lib/google/sheets.ts"]
  test_command: "npm test"
  prod_endpoint: ""
---

# What it is

Sheet layout for **Space spend views**: Summary, one tab per month, daily totals, formatting, dropdowns, hide tabs older than 12 months. Reshape per `DEC-005` — same mechanics, Space-first framing.

# Goal

Members see monthly spend at a glance in the connected Sheet (and Space UI when wired).

# Context

- `DIR-001`, `DEC-005` (reshape toward Space spend views)
- `spec/themes/01-mvp/AUDIT-2026-10.md` section 4.
- `spec/themes/01-mvp/TEMPLATES.md` sheet layout.
- `spec/themes/01-mvp/ARCHITECTURE.md` templates and sheet layout.

# Acceptance criteria

- [ ] Accept resolves the month tab from the receipt date, not from the old sheet tab.
- [ ] A missing month tab is created with headers, formatting, validation, and the daily block in one batch update.
- [ ] The Summary tab gets one row when a month tab is created, newest month first.
- [ ] The daily block pre-fills every day of the month and sums amount plus tax.
- [ ] Tabs older than 12 months are hidden, not deleted.
- [ ] The custom template keeps one tab and no block.

# Verification

- Static trace ID: `// @implements FEAT-104`
- Target files: `src/lib/google/sheet-layout.ts`, `src/lib/google/sheets.ts`
- Test: `npm test`
- Production: none until the layout is proven on Preview.

# Out of scope

- Migrating old single-tab sheets.
- Yearly spreadsheet rollover.
- Share month as PDF.

# Definition of done

A new Sheet has Summary plus the current month tab, a receipt dated last year creates and hides its tab, and the daily totals match a hand sum on a three-receipt fixture.

# Notes

`sheet-layout.ts` does not exist yet. Formatting constants belong in `sheet-style.ts`, not in the append route.
