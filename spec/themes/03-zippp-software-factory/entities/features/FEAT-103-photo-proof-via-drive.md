---
id: FEAT-103
type: feature
title: Photo proof via Drive
status: todo
assignee: adit
relations:
  blocks: []
  implements: []
  depends_on: []
verification:
  target_files: ["src/lib/google/drive.ts", "src/app/api/sheets/append/route.ts"]
  test_command: "npm test"
  prod_endpoint: ""
---

# What it is

An optional photo proof path that uploads the accepted receipt JPEG to the user's own Google Drive, links it from the Sheet row, and trashes the file if the append fails.

# Goal

Make reimbursement claims complete without zippp storing a receipt image.

# Context

- `spec/themes/01-mvp/AUDIT-2026-10.md` section 4.5.
- `spec/themes/01-mvp/TEMPLATES.md` photo proof.
- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` section 6.2.

# Acceptance criteria

- [ ] `src/lib/google/drive.ts` creates `[zippp] Receipts/YYYY-MM/` and uploads the downscaled JPEG.
- [ ] The Sheet row links the Drive file with a server-built hyperlink, never a client formula.
- [ ] An append failure trashes the uploaded file and refunds the credit.
- [ ] An upload failure appends without a link and returns a soft photo failure.
- [ ] zippp keeps no server copy of the image.
- [ ] The privacy copy discloses that the photo is saved to the user's Drive when proof is on.

# Verification

- Static trace ID: `// @implements FEAT-103`
- Target files: `src/lib/google/drive.ts`, `src/app/api/sheets/append/route.ts`
- Test: `npm test`
- Production: none until the path is proven on Preview.

# Out of scope

- zippp-hosted image storage.
- PDF export from the app.
- Donation photo changes.

# Definition of done

A reimbursement receipt produces a Sheet row with a working Drive photo link, and a forced append failure leaves no Drive file and no spent credit.

# Notes

The `drive.ts` module does not exist yet. The append route already owns the spend, append, and refund order.
