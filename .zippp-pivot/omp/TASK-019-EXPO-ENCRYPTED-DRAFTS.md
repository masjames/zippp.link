# P3.1/P3.2 — Expo capture and encrypted local drafts

**Status:** Web capture and encrypted Inbox verified. Native compilation, SQLCipher/key-store, and camera verification remain pending on the owner's Mac.  
**Goal:** Let a person capture receipts into a durable, encrypted Expo Inbox without changing confirmed spending.

## Scope

- Verify the chosen Expo camera, web picker, key storage, and encrypted database APIs on the actual Expo SDK.
- Implement platform-appropriate encrypted local image and metadata persistence, isolated by authenticated owner where available.
- Save durably before any upload/OCR; keep capture available for repeated shots and provide a permission/picker fallback.
- Show captured drafts in Inbox. Drafts must not affect Home totals.
- Do not upload to Drive/OCR, write Sheets, change billing, or claim native verification before Mac/device checks.

## Acceptance

- Deterministic tests prove encrypted payload round-trip, per-owner separation, and persistence/reload behavior.
- Browser verifies picker fallback, durable Inbox item, and no network processing before approval.
- Expo typecheck, SDK compatibility, and web export pass.
- Native SQLCipher/key-store/camera behavior is documented and verified on the owner's Mac before this slice is called fully cross-platform.
- Record results and update `STATE.md`.
