# 04 — Ledger, Accounts, Google Sheets, Redis and Offline Sync

**Status:** proposed normalized data and synchronization contract. Adapt with an explicit migration from existing Sheets templates. **Google Sheets is the source of truth for confirmed financial records.** The local outbox is authoritative only for *uncommitted local intent*, not for confirmed cloud state.

## Vocabulary and distinctions

- **Transaction:** an approved posted cash-flow event with stable client operation id and server transaction id.
- **Draft:** captured/typed item not yet approved; must not affect confirmed totals.
- **Account:** one currency-denominated container of cash, cash-like balances or reserved savings.
- **Expense:** external outflow for consumption/obligation; counts in Today and Week when posted at effective timestamp.
- **Income:** external inflow; increments an account but does not count as negative spending.
- **Transfer:** internal movement, decreases one account and increases another, no expense or income.
- **Reconciliation:** adjust recorded closing balance with an explicit adjustment event and explanatory provenance, not a silent overwrite.
- **Balance:** current sum of linked daily-use account balances, excluding reserved savings by default. If an account is manually maintained, data freshness/completeness matters.
- **Upcoming bill:** future obligation, informational/planning until paid; when marked paid, make one confirmed expense and update status atomically as far as APIs allow.

## Recommended canonical workbook (proposed V2, never silently impose on existing workbook)

One user-controlled spreadsheet with stable sheet/tab ids and a version field, rather than month tabs as the primary event store. Tabs:

| Tab | Columns | Constraints |
|---|---|---|
| `ZIPPP_META` | `schema_version, timezone, default_currency, cycle_day, last_app_write_rev` | one authoritative configuration row; user-readable |
| `Accounts` | `account_id, name, currency, kind, availability, is_reserved, opening_balance_minor, opening_at, active, updated_at` | stable UUIDs; savings reserved flag |
| `Transactions` | `txn_id, op_id, posted_at, local_date, timezone, kind, account_id, counterparty_account_id, amount_minor, currency, merchant, note, category, receipt_id, supersedes_txn_id, source, created_at` | one **event per row**, amount integer in minor units; corrections append compensating/replacement events |
| `Bills` | `bill_id, title, amount_minor, currency, due_date, recurrence_rule, reminder_setting, linked_txn_id, status` | future obligation not included as spent until paid |
| `Goals` | `goal_id, name, reserved_account_id, target_minor, due_date_optional, active` | goals must not fabricate balance |
| `Audit` (optional) | `event_id, op_id, actor, event, recorded_at, version` | app operation trace without tokens or images |

This is a **draft schema**, not current code contract. Prefer a dedicated schema migration instead of writing new columns into a user's old template without consent. For currencies like IDR with no decimal subunit in common usage, store configured minor-unit exponents explicitly. Never sum across currencies without a conversion amount, date and source.

## Accounting invariants

1. Opening balance + signed external inflows − signed external outflows ± transfers ± explicit reconciliation events = displayed current balance, for a single currency and selected accounts.
2. A transfer uses one operation id with both source and destination, and appears once in Activity. It does not alter combined total cash even when a dedicated savings account is involved.
3. Savings reserved transfers decrease **everyday balance** and increase **reserved savings**, while aggregate cash across both remains unchanged.
4. Never count a draft, failed receipt, duplicate scan, pending Google write, or scheduled bill as a confirmed expense.
5. When an approved local mutation has not synced, Home may show a **provisional** change separately but never label it as a confirmed Sheet total. An unambiguous status/annotation is required.
6. Deleting/correcting a confirmed row creates a traceable revision or reversal. Manual direct edits in Sheet may be imported as a new revision with conflict resolution; never quietly drop customer changes.
7. Today and Week are determined by user's configured local time zone (default contextual; e.g. Asia/Jakarta) and agreed week start (propose Monday). Define DST and midnight test cases.
8. A cash-flow cycle starts on the selected day (1–28 easy default; 29–31 clamp to last day of shorter months **after owner approval**). `cycle_start` and `cycle_end` must be inclusive/exclusive calendar instants, with stable labels.
9. A user may disconnect Google while offline; no background upload should resume until consent and the correct account identity are re-established.
10. The backend returns snapshots including `as_of`, `revision`/fingerprint, `source`, `pending_count`, `complete_through` if known, and sync state. Unknown completeness is not zero spending.

## Idempotent approved write protocol

```text
Client review: user taps Save expense
  -> create durable local OutboxOperation(op_id UUID, immutable approved payload, receipt_id)
  -> show pending locally, without labelling it Sheet-confirmed
  -> POST to server with op_id and stable auth identity
  -> server checks prior operation result and user ownership
  -> server coordinates optional Drive upload of photo and a canonical Sheet append
  -> server reads back or otherwise verifies authoritative row, stores op result
  -> client marks local outbox `committed`, refreshes summary projection
  -> Home shows synced only after relevant confirmed writes acknowledged
```

Google Sheets has no general-purpose cross-resource transaction. **Exactly-once user-visible effect**, not a claim of atomic transaction across Drive, Sheets, Redis, is the design goal: use durable idempotency registry, read-before-retry if response lost, stable ids written into Sheet, and recovery logic. The server must not charge twice on retry. Receipt image upload may complete before Sheet; orphan cleanup must be safe and traceable.

## Draft inbox and Drive

- On shutter, immediately store encrypted local receipt image and immutable `receipt_id` / captured-at metadata; keep camera ready.
- OCR stages: `captured`, `queued`, `extracting`, `ready`, `needs_attention`, `failed`, `approved_pending_sync`, `synced`, `discarded`.
- On network availability and with user's consent, upload captured photo to their own Drive, potentially in a dedicated `[zippp] Receipts/Drafts` structure. A **Drive-based draft manifest** or a small user-owned metadata artifact is needed for cross-device draft inbox; a picture without status metadata cannot support a proper inbox. Design/permission scope needs verification.
- Never place unapproved receipt values in the confirmed `Transactions` tab. Only a stable receipt reference (on approved transaction) links photo and money.
- Drive failure must not destroy a local draft. If Drive is blocked, show `Backup pending`. If the user has chosen to retain photo evidence, do not delete it silently.
- Discard draft removes it from inbox; photo deletion behavior must respect consent and retention preference.

## Projection cache in Upstash

- Key scope includes `user_id`, `workspace_id`, schema version, time-zone configuration and account-selection revision. Never use a shared fallback user id.
- Content: smallest feasible aggregate `today`, `week`, `daily_use_balance`, selected account sums, recent confirmed transactions, `sheet_revision`, `source_checked_at`, `computed_at`, data-completeness markers.
- Expiry: propose 60-second hot cache + stale-while-revalidate only with correct visible status. Actual TTL is a performance experiment, not an accuracy guarantee.
- Invalidation: after confirmed write, account edit, cycle setting edit, significant user login/sheet switch; manual Sync bypasses fresh projection cache.
- Refresh from **the specific user's own Sheet** and handle pagination/quotas; scheduled refresh only where feasible and useful, without endless polling.
- Privacy: store minimal encrypted content where mandated; Redis TLS alone does not make values end-to-end encrypted. Key rotation/key management and authenticated access required.
- Cache loss is recoverable; projections can always be rebuilt from authoritative source.

## Sync button state machine

| State | Header copy | Action on tap |
|---|---|---|
| clean and connected | `Synced · 2m ago` | explicit refresh from Sheet |
| actively checking/committing | `Syncing…` | no duplicate job; show progress |
| local approved changes not yet committed | `Changes pending` | retry after connectivity/grant checks |
| offline | `Offline` | show last confirmed data; queue write |
| Google grant absent/expired | `Reconnect Google` | consent recovery flow |
| conflict/error | `Sync needs attention` | show one concrete actionable issue |

The system must report **what** was synced (ledger, receipt photo or both) separately in details when one succeeds and one fails. Never show global `Synced` if required in-flight operations remain unresolved.

## User-edited Sheet policy (proposed)

Google Sheets is intentionally user-controlled. On read, parse rows and report invalid records rather than ignoring them. If a user edits an app-owned id, detect and quarantine conflict; preserve original and ask the user how to resolve only when consequential. If a user changes a numeric amount directly in Sheets, projections must reflect a refreshed valid row. The app should advise users to keep ids and schema headers stable and offer an import repair preview. Define schema repair/version bump explicitly.

## Sync test matrix

- Same `op_id` sent 10× -> exactly one Sheet transaction and once-only usage debit.
- Successful Google append + lost HTTP response -> retry finds existing transaction and returns committed.
- Photo uploaded, Sheet append fails -> draft and image remain recoverable; pending status persists.
- Another device updates Sheet -> manual Sync shows changed totals, respecting cache invalidation.
- Local pending expense + same receipt on second device -> duplicate detection, not double confirmed spending.
- Offline capture 10 receipts, process death, relaunch -> all encrypted drafts recover.
- Offline after a confirmed snapshot -> Home still shows last known confirmed values, not “0” or false freshness.
- Transfer into savings -> combined cash unchanged, everyday cash reduced; no expense counted.
- Sheet edited during outbox write -> stale revision conflict policy exercised rather than overwriting silently.
