---
id: FEAT-103
type: feature
title: Space receipt proof via Drive
status: todo
assignee: adit
relations:
  blocks: []
  implements: ["DIR-001"]
  depends_on: ["DIR-001", "DEC-005"]
verification:
  target_files: ["src/lib/google/drive.ts", "src/app/api/sheets/append/route.ts"]
  test_command: "npm test"
  prod_endpoint: ""
---

# What it is

Optional **Space** receipt proof: upload the confirmed JPEG to the user's Google Drive, link from the Sheet/Space row, trash the file if persist fails.

# Goal

Audit trail on the user's Drive — zippp never hosts receipt images.

# Context

- `DIR-001`, `DEC-005` (keep as Space receipt proof)
- `spec/themes/01-mvp/AUDIT-2026-10.md` section 4.5.
- `spec/themes/01-mvp/TEMPLATES.md` photo proof.
- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md` section 6.2.

# Acceptance criteria

- [ ] `src/lib/google/drive.ts` creates `[zippp] Receipts/YYYY-MM/` and uploads the downscaled JPEG.
- [ ] The Sheet row links the Drive file with a server-built hyperlink, never a client formula.
- [ ] A persist failure trashes the uploaded file and does not leave a half-applied spend.
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

A confirmed spend produces a row with a working Drive link; a forced persist failure leaves no orphan Drive file.

# Notes

The `drive.ts` module does not exist yet. The append route already owns the spend, append, and refund order.
