# 13 — Target Cash-Flow Domain Contracts and Invariants

**Status:** conceptual implementation contracts for the next ZIPPP. They are NOT claims about the existing API or Google Sheet columns. Convert into real TypeScript types and tests only after the current repository is audited and workbook schema decisions are approved.

## Core entities

```ts
type ISODate = `${number}-${number}-${number}`;
type MoneyMinor = string; // base-10 integer minor units encoded as decimal string; never float arithmetic
interface Money { currency: 'IDR'|'AUD'|string; minor: MoneyMinor }
type AccountKind = 'bank'|'ewallet'|'cash'|'savings'|'other_liquid';
interface Account { id: string; label: string; currency: string; kind: AccountKind; includedInEverydayBalance: boolean; archived?: boolean }
type TxKind = 'expense'|'income'|'transfer'|'adjustment';
interface LedgerEntry { id: string; kind: TxKind; occurredOn: ISODate; createdAt: string; accountId: string; amount: Money; description?: string; categoryId?: string; sourceDraftId?: string; idempotencyKey: string; correctionOf?: string; syncState: 'local_pending'|'server_accepted'|'sheet_committed'|'conflict' }
interface Transfer { id: string; fromAccountId: string; toAccountId: string; amount: Money; occurredOn: ISODate; idempotencyKey: string }
type DraftState = 'captured'|'processing'|'ready'|'needs_attention'|'approved_pending'|'committed'|'discarded';
interface ReceiptDraft { id: string; imageLocalRef?: string; driveFileId?: string; state: DraftState; candidate?: Partial<LedgerEntry>; captureAt: string; extractedAt?: string; approvedAt?: string }
interface CashFlowCycle { startDay: number; timezone: string }
interface ScheduledObligation { id: string; name: string; dueOn: ISODate; amount?: Money; status: 'planned'|'paid'|'cancelled'; remind: boolean; recurrenceRule?: string }
```

Use integer minor units where supported. IDR normally has zero decimal minor units; AUD has cents. Confirm currency-specific representations before coding. When supporting multi-currency accounts, **do not sum currencies without a versioned, sourced conversion rate**. Avoid treating scheduled bills as already paid.

## Accounting invariants

1. **Only approved ledger entries affect confirmed spending**. Captured, OCR-ready and discarded drafts must contribute exactly zero to confirmed totals.
2. **Income** adds to its destination account balance. **Expense** subtracts from its funding account, on the recorded date.
3. **Transfer** subtracts from the source and adds to destination, but total across accounts in the same currency is unchanged; transfers do not alter income/expense totals.
4. **Saving** is a transfer to an earmarked account. Everyday balance excludes accounts marked reserved, but assets remain available in Accounts via **Show savings**.
5. **Corrections** preserve lineage and avoid silently introducing duplicate ledger entries. Confirm whether append-only corrections are feasible in the current Sheet before implementing.
6. **Period summaries** use the user's selected start-day and time zone; 29/30/31-day edge cases follow a documented clamp rule (the start day is min(configured day, days in a given month)). Tests must cover February and DST in Australia.
7. **Upcoming bills** affect anticipated commitments, not historical confirmed spending, until payment is recorded.
8. **Source of truth:** every confirmed row has a stable unique ID in the Sheet. Redis is only a snapshot with source revision/refresh metadata, not a second ledger.
9. **No phantom accuracy:** unknown records/partial connected accounts must be labeled as partial when material; never replace unknown totals with zero.
10. **Idempotency:** retrying the same approved draft uses the same idempotency key; a timed-out Sheet write can be reconciled rather than appended blindly.

## Sync state machine

```text
CAPTURED (local encrypted draft)
  -> PROCESSING -> READY -> APPROVED_PENDING
  -> durable pending outbox -> SHEET_COMMITTED -> Redis projection refreshed
                    |              |
                    | network down | ambiguous Sheet response
                    v              v
               RETRY LATER     READ/RECONCILE BY UNIQUE ID
```

Google Drive receipt upload is independently retried and tracked. **Do not claim full multi-resource atomicity**: Sheets append and Drive photo upload cannot form one transaction. UI states should distinguish `Sheet synced` from `Photo pending` and use conservative aggregate labels when they differ.

## Server boundaries

- New mobile and web clients ask a server API for authenticated summaries/commands; they never hold Google refresh tokens or connect to Upstash directly.
- Server verifies subject and workbook owner before reads and writes; the user's chosen workbook ID is not an authorization grant.
- Cache key must bind user identity + workbook ID + schema revision. Rebuild after invalidation or expiry; avoid storing unnecessary raw receipt data in Redis.
- Offline receipts/transactions live in platform-appropriate encrypted storage. Verify an encryption library's actual web/native behavior and threat model; **do not label local browser storage end-to-end encrypted by assumption**.
- Server API is versioned or backward-compatible with the current mobile/web clients during migration.

## Target acceptance fixtures

| Fixture | Given | Expected |
|---|---|---|
| F-01 | 3 captured receipts, no approval | today/week/balance unchanged |
| F-02 | Approved Rp42,000 expense from BCA | spending increases 42,000, BCA balance decreases 42,000 exactly once |
| F-03 | Save request times out after Sheet append | retry resolves existing stable ID, one ledger row |
| F-04 | Transfer 300,000 bank → savings | everyday balance -300,000; savings +300,000; spend 0 |
| F-05 | Transfer 200,000 between everyday accounts | combined everyday balance unchanged; spend 0 |
| F-06 | Bill due tomorrow, not paid | obligation visible; confirmed spend unchanged |
| F-07 | Paid bill | one expense, obligation marked paid; second click no extra expense |
| F-08 | Cash-flow cycle begins 25th | date 24th belongs prior cycle; 25th new cycle |
| F-09 | Google offline, 2 approved local entries | clearly `Pending · 2`; no falsely synced status |
| F-10 | Redis deleted | server reconstructs correct home figures from Sheet |
| F-11 | Google Sheet externally edited | stale cache invalidated on manual refresh; conflict resolved/surfaced |
| F-12 | User A requests user B's workbook | authorization denies before any Google data access |
| F-13 | OCR thinks merchant or date uncertain | review field clearly editable/flagged; no invented facts |
| F-14 | Recurring bill falls in short month | due date clamp rule consistently applied |
| F-15 | IDR + AUD accounts | values not incorrectly summed without FX handling |
| F-16 | Drive receipt upload fails after Sheet success | expense remains committed; photo shows pending/retry |

## What must be discovered during P0.1

- Actual Google Sheet header names/version, field shapes and line-item row accounting.
- Existing write idempotency/usage-unit semantics and failure windows.
- Actual summary route and Redis cache contract.
- Android app's auth/mobile bearer behavior, device grant and environment base URL.
- Whether receipt proof is uploaded today, and under what granted Drive scope.

No table migration is authorized by this document. The first execution task is **audit only**.
