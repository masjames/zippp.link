# TASK-010 — Web Receipt Inbox

**Status:** VERIFIED LOCALLY — 102 tests, typecheck, build, and synthetic browser navigation passed. Native builds remain deferred to the owner's Mac.

## Objective
Make the existing persisted capture queue accessible from Home and Capture. Users can inspect receipt statuses and choose a specific item to review using the existing review/send flow. Opening an item must never send it automatically.

## Boundaries
- Reuse existing IndexedDB drafts and extraction/send behavior; do not create a second receipt ledger or change Sheet/OAuth/billing APIs.
- Show only known receipt details; uncertain fields remain generic. Do not claim that drafts are encrypted or isolated per account.
- Preserve existing no-credit capture restrictions; Home/Inbox may remain readable.
- No real Sheet, Drive, payment, or customer-data access during verification.

## Verification

See `.zippp-pivot/outputs/TASK-010-RECEIPT-INBOX-RESULTS.md` for commands, browser evidence, and storage limitations.
