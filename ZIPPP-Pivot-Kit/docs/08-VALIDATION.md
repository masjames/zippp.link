# 08 — Verification, UAT, and Release Quality Gates

## Working principle

Tests verify *financial meaning*, not only that screens render or routes return HTTP 200. Goal-backward verification means the criterion is the user's observable result. Every milestone has a targeted automated suite, device/browser evidence and explicit owner UAT; code without evidence is `implemented`, not `verified`.

## Traceable scenario matrix

| ID | Requirement | Scenario | Expected result | Gate |
|---|---|---|---|---|
| ACC-001 | Honest Home | User has no recorded accounts | Placeholder/empty action, never fake Rp0 as a comprehensive balance | Web, Android, iOS |
| ACC-002 | Three figures | Two approved expenses today, others prior week | Today and Week include each correct transaction exactly once | Unit + UI |
| ACC-003 | Spending by local day | Transaction at 23:59 and 00:01 in selected timezone | Correct day and week grouping, DST boundary when applicable | Unit |
| ACC-004 | Manual expense | Enter `25.000` IDR | Records IDR 25,000 and reduces selected account balance by 25,000 | Unit + E2E |
| ACC-005 | Income | Record income in bank account | Increases balance; not deducted from spending | E2E |
| ACC-006 | Transfer | Bank → wallet | Two account balances change, total everyday unchanged, no expense | Unit + E2E |
| ACC-007 | Savings | Bank → reserved savings | Everyday balance decreases, Show savings reveals new saved balance, no spending | Unit + E2E |
| ACC-008 | Capture latency | Capture 3 receipts | Three durable inbox records, camera not blocked by OCR | Device |
| ACC-009 | Deferred review | Capture then exit/restart | Unreviewed receipt persists and does not enter Sheet/confirmed totals | Device + integration |
| ACC-010 | OCR flags | Receipt with unreadable amount | User must correct/acknowledge, unknown not fabricated | Unit + E2E |
| ACC-011 | Exactly-once | Save receipt twice / retry after timeout | One authoritative confirmed expense and no double usage debit | Integration |
| ACC-012 | Sync status | Offline with unsent approval | `Changes pending` / `Offline`, not `Synced` | UI + integration |
| ACC-013 | Manual sync | Edit Sheet on other device, tap Sync | Dashboard reflects confirmed Sheet change | Integration |
| ACC-014 | Photo backup | Drive succeeds, Sheet fails | Draft/image safely recover; no confirmed expense | Integration |
| ACC-015 | Cycle setting | Cycle 25th–24th; cross midnight | Money in/out and bills grouped in chosen cycle | Unit + UI |
| ACC-016 | Bills | Mark invoice paid | One expense, bill paid once, reminder state updated | Integration |
| ACC-017 | Privacy | OCR request captured | No Sheet id/token/full ledger in provider payload | Static + integration |
| ACC-018 | Auth | User A requests User B workspace | Forbidden; no cross-user cache-key collision | Security integration |
| ACC-019 | Accessibility | Font 200%, TalkBack/VoiceOver | All amounts readable, logical focus, accessible actions | Device |
| ACC-020 | Regression | Old Sheet template containing repeated receipt total per item row | One aggregated expense per receipt; no double counting | Fixture |

## Release gates

**Slice gate:** narrowly scoped unit tests + typecheck/lint + relevant screenshot or API probe; no unrelated refactor.  
**Milestone gate:** full tests, integration against synthetic Google Sheet, security invariants, Android/iOS/web smoke UAT and persisted evidence.  
**Production gate:** consent, store compliance, API availability, data recovery, monitoring, billing, rollback and owner signoff. Never use a test APK containing a bypass secret in production.

## Suggested test harness

- Pure TypeScript accounting functions and fixtures in one shared package with deterministic golden cases.
- Contract tests for both old and new API responses; snapshots of legacy template header maps (redacted/synthetic).
- Sheet/Drive adapters with deterministic mocks for speed, plus small real Google sandbox integration suite to catch permissions and quota behavior.
- React Native component tests for form defaults and state transitions; Playwright for Expo web; Detox/Maestro or platform test framework for device flows once selected.
- Capture quality measurements on actual low- and mid-tier Android device and iPhone. Simulators cannot prove autofocus, flash or background retention.

## Evidence report per task

Record: task id, code diff summary, touched files, exact test commands and results, screenshot/trace paths, risks, user-facing behavior, whether migration was backwards-compatible, how to revert, commit SHA and next task. Keep the report concise; verbose command logs remain artifacts, not pasted into the next model prompt.

## Quantitative targets (proposed, refine after baseline)

- No duplicate financial writes in idempotency stress tests.
- No unapproved draft included in confirmed money sums.
- First user cash snapshot achievable with a minimally entered account, with clearly stated data coverage.
- Capture feedback instant and next shutter available without waiting for network OCR.
- All primary controls meet minimum touch size, clear labels, keyboard support and screen readers.

Targets are acceptance objectives rather than measured performance claims.
