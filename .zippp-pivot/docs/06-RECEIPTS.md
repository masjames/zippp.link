# 06 — Receipt Capture, Inbox, OCR and Approval

## Purpose

Enable a person standing at a checkout counter to photograph a receipt in seconds, then review it when convenient. **Capture is not approval.** Receipt processing must not block the camera, and records enter the user's Google Sheet only after explicit confirmation.

## Core journey

```text
Home → Capture tab → shutter → encrypted local draft → camera stays open
                                              ↓
                           background upload / OCR / verification
                                              ↓
                       Inbox: Processing | Ready | Needs attention
                                              ↓
                    Review: image + editable amount/date/merchant/account
                                              ↓
                 Approve → idempotent Sheet write → confirm sync → Home totals
```

### Capture UI

- Full available viewfinder respecting platform safe areas and the bottom tab/header treatment. Single highly visible circular shutter with accessible label `Capture receipt`.
- Inbox counter in a compact corner; can open it without losing unsaved captures.
- Optional flash/focus control only if functional. Do not present a fake preview flash toggle.
- One-shot capture saves to local encrypted disk **before** network processing begins. Provide brief haptic and subtle `Captured` feedback.
- Allow repeated capture without repeatedly navigating Review or showing interruptive dialogs.
- Optional receipt-edge detection and auto-shutter may be added later with an obvious opt-out; false positive captures are worse than one deliberate tap.
- Photo picker fallback for web/unsupported camera environments; proper permission-denied flow.

### Recognition pipeline

Existing backend historically uses PP-OCRv6, DeepSeek Flash, deterministic verifier and Gemini fallback. Keep as an adapter until actual costs, provider policy, latency and quality are measured. **No Google Sheet data, OAuth token or unrelated financial history is passed to the OCR provider.** A receipt image is sensitive: require clear user consent to cloud OCR.

A bounded job owns `receipt_id`, `capture_id`, `image_hash` (if privacy-safe), `ocr_job_id`, `attempts`, `status`, `created_at`, `result_version` and telemetry without full private text. Use sensible retries with backoff; avoid parallel retries that charge providers repeatedly. Extraction returns field values with provenance and confidence/flags; the deterministic verifier checks amounts and arithmetic. Never fabricate blank OCR fields.

### Inbox states

| State | Copy/affordance | Financial effect |
|---|---|---|
| `captured` | Captured, upload pending | None |
| `queued` / `extracting` | Processing | None |
| `ready` | Review | None |
| `needs_attention` | Check uncertain details | None |
| `failed` | Try again / Enter manually | None |
| `approved_pending_sync` | Recorded locally, syncing | Pending, not confirmed |
| `synced` | Recorded in your Sheet | Confirmed |
| `discarded` | Undo briefly if supported | None |

Capture count, review count, and approved-pending-sync count are **different**. The header `Synced` state can only claim complete if relevant pending mutations and required backups are accounted for.

## Review form: information order

1. Receipt thumbnail with full-screen enlargement; Retake/Replace is optional.
2. Amount displayed prominently. Merchant, transaction date and account follow as editable fields.
3. Date never silently guessed: initial capture day can be the assumed default, visibly marked until confirmed.
4. Account selection is required if the user has multiple active cash accounts. If only one exists, it can be preselected but visible. Unknown account must not be silently assigned to the wrong one.
5. Category optional, not a blocking step. Line items optional collapsed section. Tax etc retained when available for evidence but **not separately summed** if total already includes it.
6. A hard flag requires edit or explicit acknowledgement. Unknown remains unknown; no invented `merchant`, category or item name.
7. `Save expense` and, for batch review, `Save & next`; `Discard` as tertiary with opportunity to recover when feasible.

### Save contract

One review confirmation creates exactly one canonical external outflow entry for the receipt total, with `receipt_id` + `op_id` + `txn_id` and sheet row fingerprint. Preserve extracted line items as metadata or separate detail tab if supported; never generate multiple spending transactions from a single receipt without an explicit user choice. Amount and currency validation run server-side, and a retry with the same `op_id` returns the same result.

If OCR yields item line totals inconsistent with the verified total, show the discrepancy and make approval require confirmation. If a user edits an amount after OCR, store before/after information minimally for quality review without sending bank data to analytics.

## Draft storage and privacy

- Encrypt captured local images and draft metadata at rest, and persist through process termination. Encryption key lifecycle must work on Android/iOS and web, with an explicit supportability plan for web encrypted storage.
- Images may be uploaded to user's Google Drive before approval for backup if consented and Google access exists. Upload does not create financial record. Maintain draft manifest/metadata, otherwise cross-device inbox cannot know which photo is ready.
- ZIPPP backend must not permanently store receipt photos. Temporary provider request buffering with bounded retention is not a promise of zero exposure; document it transparently.
- Deletion/retention: user chooses whether approved photos remain in Drive; confirm before deleting permanently from user Drive, and avoid losing pending local drafts.

## Latency budget (targets requiring device measurement)

| Step | Target user-perceived behavior |
|---|---|
| Shutter acknowledgement | Immediate, before any network activity |
| Ready for next shutter | No OCR-dependent block |
| Inbox display | Instant from local database |
| OCR | Asynchronous with progress and safe retry, not a hard promise of X seconds |
| Review opening | Immediate with last known fields; fields can hydrate as OCR finishes |
| Save | Immediate visible pending status, later exact Google confirmation |

## Required failure tests

- Offline, phone restart, expired Google grant, duplicate photo, OCR failure, blurry photo, repeated Save, two-device approval, Drive upload success + Sheet failure, Sheet success + lost response, malformed amount and merchant formula injection.
- Android: live viewfinder and flash/focus tested on actual hardware; permissions denial/regrant; background task killed and resumed.
- iOS: camera and background limits tested with foreground/background changes.
- Web: permission prompts, photo picker fallback and browser storage quota handling.
