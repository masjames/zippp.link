# ZIPPP v2 Pivot — Command Center

**Written:** 2026-11-16  
**Branch:** `v2` at canonical baseline `9799859786d238c3796910cbacbe01cb62d51d78`, plus a large uncommitted working tree  
**Audience:** owner. This is the one page that says where we are, how big the rest is, and what only you can decide.  
**This file does not authorize implementation.** It records evidence from `.zippp-pivot/` and the local checkout. It is not a claim that production, a live Google Sheet, or a phone has been proven.

Read this file first. Open a linked task or contract only when you need the source of one row.

---

## 1. The picture in one screen

ZIPPP is mid-pivot from "scan a receipt into a Google Sheet and spend a credit" toward "a quiet cash-flow app: spent today, this week, everyday balance, capture now, approve later."

The safe half of that pivot has started on the existing Next.js web app. The money-writing half has not, because you have not opened the gates that allow a new Sheet schema, Drive uploads, billing changes, or a production rollout.

| Question | Answer |
|---|---|
| Where are we? | Milestone M0 is done. Milestone M1 is started and still synthetic. The web app now has a read-only receipt Home and a local Inbox. Account isolation (TASK-011) is coded in the working tree and not verified. |
| What works for a person today, if this tree were shipped? | Sign in, connect the existing personal-expense Sheet, see today/week receipt totals, capture, review, and send with the old credit rules. Balance is explicitly unavailable. Income, transfers, savings, bills, and a cash-flow cycle do not exist. |
| What is verified? | Local tests through TASK-010: **102 passed**, typecheck, isolated build, synthetic browser. No live workbook. Android compile is deferred to your Mac. |
| What is stuck? | OhMyPi on `openai-codex/gpt-6-luna` hit `usage_limit_reached` while TASK-011 was open. Its on-screen checklist still says Build 0/3 and Verify 0/3 even though edits are on disk. |
| How big is the rest? | About **1 slice** to finish the current task. About **12 to 18 slices / 3 to 6 weeks** for a truthful web cash-flow MVP after you open Checkpoint B. About **2 to 4 months** for the full charter on the current clients. React Native for iOS is not scheduled. |
| What should you do next? | Three decisions in section 8. Do not ask an agent to invent a workbook or change billing while those are open. |

**Rough completion, as judgment, not a metric**

| Finish line | Done |
|---|---|
| Authorized track up to the next owner gate (Checkpoint B) | about 90%. TASK-011 is the leftover. |
| Web product promise: connect a Sheet, scan, approve once, see real today/week, record income, honest balance | about 25%. |
| Full charter: accounts, savings, bills, cycle, sync, encrypted queue, Android parity | about 10 to 15%. |
| React Native Android + iOS + web replacement | 0%. Not approved. |

---

## 2. How we work, and why it feels slow on purpose

The pivot does not use the old Software Factory Kanban as the driver. Factory entities (FEAT-102, STORY-102, Zippp Space) are the previous product. They stay in the repo so production behavior is not erased by accident. The execution loop lives here:

```text
You approve one task
        |
        v
OhMyPi, one model only: openai-codex/gpt-6-luna
Reads only AGENT-RULES.md, STATE.md, and that TASK file
        |
        v
Discuss only if the change is irreversible
Plan 1 to 3 edits
Execute the smallest diff
Verify: focused tests, npm test, typecheck, isolated build,
        browser when the change is visible
        |
        v
Write .zippp-pivot/outputs/TASK-xxx-RESULTS.md
Update STATE.md
Stop. Do not start the next phase alone.
```

Rules that keep user money safe:

- One slice per session. A fresh chat next time. No subagents, no second model, no paid search.
- Never `git add -A`. Never print `.env`, tokens, Sheet ids, or receipt contents.
- No deploy, no push, no Sheet write, no payment change, unless you say so in that task.
- If the model is unavailable, stop. The Luna session did stop. It did not quietly switch providers. (A Cursor session on Grok is a different tool. It is not the OMP executor unless you assign it.)
- Old `AGENTS.md` and `spec/themes/03-zippp-software-factory/zippp-context-for-claude.md` still describe Zippp Space, prepaid credits, and FEAT-102. When they conflict with the pivot, the agent must keep production compatibility and write the conflict down. The context file's snapshot is still 2026-11-03. Treat it as the legacy contract, not the destination.

Source of truth by question:

| Question | Read |
|---|---|
| What is the product now supposed to be? | `.zippp-pivot/docs/01-PRODUCT.md` |
| What must you approve before we touch money or Google? | `.zippp-pivot/docs/12-DECISIONS.md` and section 8 below |
| What is implemented today? | Code, tests, and `.zippp-pivot/outputs/` |
| What is the next allowed edit? | `.zippp-pivot/omp/STATE.md` |
| What the November 2026 prototype looked like | `.zippp-pivot/reference/ZIPPP-Prototype-v0.8.html` (visual only) |

---

## 3. Two products in one repository

Do not merge these in your head. Both are real. Only one is the active build.

### 3.1 What production code already was (legacy spine)

A person signs in with Google, picks or creates a Sheet from a template (personal expense is the one this pivot can read), photographs a receipt, reviews extracted fields, and taps send. Send spends one prepaid credit and appends rows to their Sheet. Optional photo proof to their Drive was specified and is not the thing these pivot tasks built. Android is a Kotlin CameraX client that pairs or signs in. Its draft store was in memory at audit time. Mobile API is dark in production until a later flag. Telegram exists. WhatsApp is archived. Spaces, goals, and fair-use subscription designs exist in specs and some code. They are parked for this pivot, not deleted.

### 3.2 What the pivot is trying to become

A cash-flow awareness app. Home shows **Spent today**, **This week**, and **Balance**, then latest spending. Capture is a camera. Photos land in an inbox and do not change confirmed totals until the person approves. Income and expense can be typed. Savings are separate and hidden from everyday balance. A transfer is not spending. The confirmed ledger stays in the user's Google Sheet. Drive holds proof images only with consent. Upstash may cache a projection. Upstash is never the ledger. Redis dying must be recoverable by rereading the Sheet.

The success sentence from `docs/00-START-HERE.md`:

> A new user can connect a personal Google Sheet, record income, scan receipts into an inbox, approve expenses, and see truthful cash-flow totals. A returning user can understand today/week/balance immediately, with clear pending/offline status. No duplicate writes, no fabricated data, no unapproved receipt in the ledger, and no dependency on Google Drive or Redis being perfectly available.

We can do the "scan into an inbox" and "see receipt totals" parts on the web, with synthetic proof. We cannot yet do income, truthful balance, pending/offline sync, or "no duplicate writes" under the new ledger contract.

---

## 4. Size

### 4.1 Roadmap milestones

From `.zippp-pivot/docs/09-ROADMAP.md`. Slice names are the plan. Task numbers are what actually ran. They diverged after P1.3 into web safety and UI, which was the right call because the Sheet write gate is closed.

| Milestone | Plan | Actual |
|---|---|---|
| M0 Freeze and discover | P0.1 audit, P0.2 baseline, P0.3 decisions | Done. TASK-001, 002, 003. |
| M1 Ledger before interface | P1.1 models, P1.2 read adapter, P1.3 balances, P1.4 cache, P1.5 exactly-once writes | P1.1 done. P1.2 and P1.3 done only on synthetic data and not fully wired. P1.4 and P1.5 not started. |
| M2 React Native shell | Expo spike, auth, 3-tab shell, Home, accounts | Not started. You chose to keep Next.js and Kotlin. |
| M3 Capture and inbox | Camera, encrypted drafts, OCR adapter, review, Drive proof | Web camera and review already existed. TASK-007 to 011 harden drafts and add an inbox. Encryption, background OCR contract, and Drive proof are not done. |
| M4 Manual entry, sync, planning | Income/expense forms, outbox, cash-flow cycle, savings, polish | Not started. |
| M5 Beta | Expo web launch, Android then iOS, monitoring, rollback | Not started. Production gates closed. |

### 4.2 What "a slice" costs

One slice, the way TASK-009 and TASK-010 were done, is: a short task file, a few files, tests, typecheck, an isolated production build, a synthetic browser pass, a results note, and a stop. That is hours of agent time, not a feature launch.

Calendar if you review between slices and stay on one agent:

| Target | Slices left | Time | Cursor Pro, Grok 4.7 Max |
|---|---|---|---|
| Verify TASK-011 and stop at Checkpoint B | 1 | hours to 1 day | about 5 to 15% of one monthly Cursor Models pool. 15 to 30% if the agent rereads the whole repo in long context. |
| Web MVP after you open Checkpoint B: idempotent approve, manual income and expense, accounts on Home, honest incomplete data | 12 to 18 | 3 to 6 weeks | about 1.5 to 3 Pro months |
| Full charter on Next.js + existing Kotlin, including cycle, bills, savings, sync, local encryption story, Android proof | many | 2 to 4 months | several Pro months. Pro+ or less Max if you want it inside fewer cycles. |
| Replace clients with React Native, add iOS | not estimated | extra months | not approved |

Grok 4.7 on legacy Cursor Pro draws the **Cursor Models** pool (monthly). Standard rates published by Cursor: $2 per million input tokens, $6 per million output. Fast is 2x. Context over 256k is 2x standard, 3x if Fast. Legacy Max adds about 20% on top of API price. Cursor does not publish the dollar size of the included pool anymore. The live number is the Spending tab. Codex usage that stopped OhMyPi is a different meter.

Tradeoff: Max plus "read the entire repo" spends the pool on orientation. The pivot loop spends it on one verified outcome. Use Max for a slice. Do not use Max to reread 1,800 lines of legacy context every task.

### 4.3 What is on disk but not on the remote yet

Commit `9799859` already contains the pivot kit (docs 00 to 13, TASK-001, the audit output, legacy reference). Everything after that is local only, until you ask to commit it:

- Task files and results for TASK-002 through TASK-010
- Unfinished TASK-011 notes
- Web Home, Inbox, `/api/cashflow/legacy-summary`
- `src/lib/cashflow/` models, legacy adapter, balance projection
- Draft recovery, unknown-date behavior, and the in-progress account split
- This command center, once this commit lands

This command-center commit does **not** include that product code. Shipping unverified TASK-011 together with a status report would mix a finished explanation with an unfinished money-path change.

---

## 5. Command center: tasks

Status words mean:

- **Verified locally:** tests, typecheck, build, and where relevant a synthetic browser. Not a live Sheet. Not a phone.
- **Synthetic only:** pure functions. Not connected to the app.
- **In progress:** edits exist. The exit checks have not passed.
- **Not started:** no implementation slice.

### TASK-001 — Evidence baseline (P0.1)

**Status:** Verified as a read-only audit.  
**User story:** As the owner, I want a written inventory of this checkout so we do not migrate a product we have not actually looked at.  
**What it proved:** Next.js, Google auth, receipt append, credits, and Kotlin Android exist. Expo/React Native does not. No accounts, income, transfers, or cash-flow summary route existed at audit time. The audit ran on `feat/121-import-statements` at `04268ef`, which is **not** the baseline you later chose.  
**Still open from that audit:** Android drafts looked memory-only. Live OAuth scopes, deployments, and real Sheet layouts were not tested. Historical bugs (refund idempotency key mismatch, Indonesian `25.000` parsed as 25, duplicate scan on retry) were recorded, not retested.

### TASK-002 — Baseline tests (P0.2)

**Status:** Verified.  
**User story:** As the owner, I want the chosen commit to pass the current test suite before anyone edits it.  
**What it proved:** On `v2` at `9799859`, 79 tests and typecheck passed. The first host had no Node on PATH. The agent unpacked Node under `/tmp`, installed missing typecheck packages in a temp prefix, and did not change the lockfile.  
**You confirmed** this commit as the canonical baseline.

### TASK-003 — Planning decisions (P0.3)

**Status:** Complete as decisions. Not implementation permission.  
**User story:** As the owner, I want the risky forks chosen before code, so an agent cannot pick a new database or a new app framework for me.  
**What you accepted for planning:** keep Next.js and Kotlin; read-only legacy adapter before any Sheet migration; local drafts before Drive uploads; keep current billing; store instant + timezone + local date; do not sum currencies; roll out in parallel with a way back.  
**What you did not open:** Checkpoints B, C, D, E. See section 8.

### TASK-004 — Domain models (P1.1)

**Status:** Verified, synthetic, not wired to the app.  
**User story:** As a later screen, I need one vocabulary for money, accounts, expenses, income, transfers, and draft state, with no floating-point amounts.  
**Files:** `src/lib/cashflow/model.ts`, `model.test.ts`.  
**What it is:** Types and guards. Minor units are decimal strings. Receipt draft states exist as names.  
**What it is not:** A database, a Sheet tab, or a screen.

### TASK-005 — Read old Sheet rows (P1.2)

**Status:** Verified for the built-in personal-expense template only.  
**User story:** As a person with an existing zippp Sheet, I want today's spending counted once per receipt, even when the template repeats the total on every line item.  
**Files:** `src/lib/cashflow/legacy-expenses.ts`.  
**Behavior:** Group by receipt id. Reject conflicts, missing ids, bad dates, unsupported currencies. Emit an **incomplete candidate**. No account id and no ledger idempotency key are invented.  
**Hard limit:** Your real workbook, if you changed columns, is unverified. These candidates must not be added into confirmed balances. The adapter itself is not what Home calls. Home uses the summary path from TASK-009.

### TASK-006 — Balance math (P1.3)

**Status:** Verified on synthetic inputs. Not wired to Home, Sheet, or P1.2.  
**User story:** As a person with several accounts, I want everyday balance to exclude reserved savings, and a transfer not to look like spending.  
**Files:** `src/lib/cashflow/balances.ts`.  
**Behavior:** Integer minor units. Unknown opening balance stays unknown, not zero. Same-currency transfers are atomic. Mixed currencies are not added. Corrections and adjustments fail closed.  
**Hard limit:** There is no opening-balance source in the old Sheet. Home is required to say balance is unavailable rather than show this function's output.

### TASK-007 — Drafts survive a reload

**Status:** Verified locally, synthetic browser.  
**User story:** As a person who photographed a receipt and then the page died, I want the photo back in review, and I do not want it sent by itself.  
**What changed:** Interrupted extraction returns to the queue. Interrupted or accepted sends return to review. IndexedDB writes count only after the transaction commits. If storage fails, the UI says so.  
**What it does not claim:** Encryption. Per-account isolation. Those are TASK-011, and encryption on the web is still an open design problem, not a slogan.

### TASK-008 — Unknown dates stay empty

**Status:** Web verified. Android source changed. Phone not built.  
**User story:** As a person whose receipt has no readable date, I want a blank date, not today's date pretending to be the receipt.  
**Behavior:** Missing date stays null through review and submit. A date you typed is kept. An old draft that had an assumed date is cleared on restore. Copy and Android string generation were updated.  
**You still owe:** a Mac build of the Android change before anyone calls the phone done.

### TASK-009 — Home reads receipt totals

**Status:** Verified locally with synthetic data. Live Sheet not read.  
**User story:** As a signed-in person, I want Home to show what I already sent to my personal-expense Sheet: spent today, spent this week (Monday through today), and the latest receipts. If the Sheet cannot support that, tell me, and do not invent a balance.  
**Route:** `/app` sends a normal signed-in user to `/app/home`. `GET /api/cashflow/legacy-summary` resolves the user and the saved workspace on the server. The browser cannot pass a workbook id.  
**Behavior:** Repeated receipt totals count once. IDR and AUD stay separate. Unreadable or future-dated rows mark the picture incomplete. Unsupported templates get an explanation and a link to Sheet settings. Zero credits: Home stays readable. Capture still goes to top-up.  
**Unauthenticated check:** HTTP 401.  
**Not included:** income, accounts, cache, writes.

### TASK-010 — Inbox of local receipts

**Status:** Verified locally, synthetic browser.  
**User story:** As a person with several photos waiting, I want a list, and I want to open one without sending it.  
**Routes:** `/app/inbox`. Home shows a count. Choosing a row opens `/app/snap?review=<id>` in the existing review flow. New captures select the newest item.  
**Zero credits:** Inbox can be read. Review and capture still hit the top-up guard.  
**Not claimed:** encrypted storage, or that a second Google account on the same browser cannot see the first account's photos. That is TASK-011.

### TASK-011 — One browser, two Google accounts

**Status:** In progress. Not verified. OMP stopped on a Codex usage limit.  
**User story:** As a person who signs out and someone else signs in on the same browser, I do not want the second person to see or send my unsent receipts. Old photos that have no owner must stay put until I explicitly import them.  
**Intended behavior:** New drafts store the Google user id. The app loads drafts only after identity is known. Capture waits until that storage is ready. Legacy unowned rows can be claimed in one IndexedDB transaction after a warning. Web append sends the draft's user id and the server rejects the call if the session user changed, before a credit spend or a Sheet write. Mobile bearer behavior stays as it is.  
**Files touched in the working tree (uncommitted, unverified):** `src/lib/batch-db.ts`, `src/components/app/AppProvider.tsx`, `src/components/app/screens/SnapScreen.tsx`, `src/lib/auth/append-owner.ts`, tests, wording, Android review strings from earlier slices.  
**Security sentence you should remember:** This stops the app UI from showing another account's drafts. It does not encrypt IndexedDB. A compromised browser or another script on this origin can still read it. Do not describe it as encrypted.

---

## 6. Command center: user stories by screen

These are the screens in `.zippp-pivot/docs/05-UX-IA.md`. "Story" is the job. Status is this checkout, not the prototype HTML.

| ID | Story | What the person is trying to do | Status |
|---|---|---|---|
| S01 | Welcome | Understand the promise without a fake balance | Old marketing site exists. Not rebuilt to the prototype. |
| S02 | Sign in | Prove who I am with Google | Exists on the web. Android Google/magic-link exists in code. Not re-proven on a device in this pivot. |
| S03 | Sheet setup | Connect my spreadsheet and understand the permission | Exists at `/app/settings/sheet`. Required before Home. |
| S04 | Home | See today, week, and balance in one glance, then record income or expense | Partial. Today and week are receipt totals. Balance is an unavailable message. No income or expense buttons. No sync pill. |
| S05 | Capture | Take a photo and immediately take another | Partial. `/app/snap` is still the old camera, and the happy path still pulls you into review. Shutter-then-stay is not the contract yet. |
| S06 | Inbox | See captured, processing, ready, and failed photos | Partial. `/app/inbox` lists the local queue and status. Not grouped as the full state machine. Not cross-device. |
| S07 | Review | Check amount, merchant, date, account, then save once | Partial. Old review exists. Account picker does not. Save still means the legacy append and a credit, not a new ledger event. Opening from Inbox does not send. |
| S08 | Manual expense | Type a spend, including `25.000` as 25000 IDR | Not built in the pivot. An older manual-entry spec exists and had known bugs. Do not turn it on as-is. |
| S09 | Manual income | Record money in without calling it negative spending | Not built. |
| S10 | Activity | Search confirmed transactions | Not built. Home has a short latest-receipt list only. |
| S11 | Transaction detail | See source, correct, or reverse without a silent overwrite | Not built. |
| S12 | Spending detail | Open today or week and see the rows | Not built as its own screen. |
| S13 | Accounts | See everyday accounts, then Show savings | Not built. Balance math can express this. Nothing feeds it. |
| S14 | Transfer | Move money between my accounts without creating an expense | Not built. Checkpoint B. |
| S15 | Cash flow | See this pay cycle, money in, money out, upcoming bills | Not built. There is no bottom tab for it. |
| S16 | Bill | Remember an obligation and mark it paid once | Not built. |
| S17 | Savings | Keep reserved money out of everyday balance | Not built. Model flag exists. |
| S18 | Settings and sync | See synced, syncing, pending, or offline, and recover Google access | Settings exist for the old app. The sync state machine does not. |

Primary navigation the prototype wants: **Home / Capture / Cash flow**.  
Navigation the code has: wordmark back to Home, a capture button, an inbox link, settings, and a credit pill. Activity is not a tab in either design. Cash flow is absent.

---

## 7. Command center: acceptance stories

From `.zippp-pivot/docs/08-VALIDATION.md` and fixtures in `docs/13-CONTRACTS.md`. These are the tests that mean "the money is true." A green `npm test` does not check the ones marked not started.

| ID | Story | Expected | Now |
|---|---|---|---|
| ACC-001 / F-01 | No accounts, or only unapproved photos | No fake Rp0 balance. Drafts add nothing to confirmed spend. | Home says balance unavailable. Inbox items are local and are not in the Sheet summary. Good direction. Not proven against a real Sheet. |
| ACC-002 | Two expenses today | Today and week each include them once | Receipt rows only, synthetic. |
| ACC-003 | 23:59 vs 00:01 | Correct local day | Summary tests cover time zones on synthetic rows. Australia DST not a product feature yet. |
| ACC-004 | Type `25.000` IDR | Store 25000, reduce that account | Not built. Historical bug: parsed as 25. |
| ACC-005 | Income | Balance up, spending unchanged | Not built. |
| ACC-006 / F-05 | Transfer between everyday accounts | Balances move, spend unchanged | Math only, synthetic, unwired. |
| ACC-007 / F-04 | Transfer to reserved savings | Everyday down, savings up, spend unchanged | Math only. |
| ACC-008 | Three photos | Camera not blocked by OCR | Not the current UX. Review still interrupts. |
| ACC-009 | Kill the app before approval | Draft remains, Sheet unchanged | Web reload covered in TASK-007. Process death on Android not proven. |
| ACC-010 / F-13 | Unreadable amount or merchant | Blank or flagged, never invented | Date covered (TASK-008). Amount/merchant rules exist in the old verifier. Not re-audited as a pivot slice. |
| ACC-011 / F-03 | Save twice, or timeout after append | One row, one charge | Old append has a scan idempotency key. The refund-key mismatch from the audit is not retested. New `op_id` contract not built. |
| ACC-012 / F-09 | Offline with approved but unsent items | Say pending or offline, never synced | Not built. |
| ACC-013 / F-11 | Edit the Sheet elsewhere, tap Sync | Home matches the Sheet | Not built. Home reads when loaded. No sync button. No cache to invalidate. |
| ACC-014 / F-16 | Drive succeeds, Sheet fails | Expense not confirmed, photo recoverable | Not built. |
| ACC-015 / F-08 | Cycle starts on the 25th | 24th is the previous cycle | Type exists. No screen. |
| ACC-016 / F-07 | Mark a bill paid | One expense, second click does nothing | Not built. |
| ACC-017 | OCR request | No Sheet id, token, or ledger in the provider payload | Old architecture law. Not re-proven in this pivot. |
| ACC-018 / F-12 | User A asks for user B's workbook | Denied before Google data | Summary route uses the session user. Cross-user test against a live workbook was not run. |
| ACC-019 | Huge text, TalkBack, VoiceOver | Amounts still make sense | Not tested. |
| ACC-020 | Old template repeats the total per line | One expense per receipt | Adapter and summary tests, synthetic. |
| F-02 | Approve Rp42,000 from BCA | Spend +42000, BCA -42000, once | Not built. No accounts in the Sheet. |
| F-06 / F-14 | Bill due, not paid, or short month | Visible as a plan, not as spend. Clamp rule documented. | Not built. |
| F-10 | Delete Redis | Home still correct from the Sheet | Not applicable yet. Summary does not use Redis. |
| F-15 | IDR and AUD | Never added together | Home and the math both separate them. |

---

## 8. What you should decide

These are the only decisions that change the next month. Everything else an agent can choose inside an approved slice.

### 8.1 Decide now, before the next coding session

**D-NOW-1. Finish TASK-011, and nothing else.**  
Recommended: yes. The working tree already contains the edit. Leaving it unverified means the next agent can corrupt it or "finish" a different interpretation.  
Say: "Verify TASK-011 only. Do not start P1.4."

**D-NOW-2. Who executes.**  
OhMyPi Luna is stopped on a usage cap (provider asked for a 30 minute wait, the retry limit is 5 minutes). Cursor Grok 4.7 can verify the slice if you assign it. Do not run both on the same files.  
Say which one, or wait for the Codex cap to reset.

**D-NOW-3. Commit boundary.**  
This file can go to `origin/v2` by itself. The Home, Inbox, cash-flow library, and TASK-011 edits are a separate commit when you want them reviewed. They are not on the remote until you say so.

### 8.2 Checkpoint B — closed. This is the big one.

Nothing that writes a new kind of money is allowed until you pick a workbook strategy and a backup rule.

| Option | What you get | What you risk |
|---|---|---|
| B1. Keep reading the old personal-expense Sheet. Do not add columns. | Honest today/week from receipts you already send. Balance stays "unavailable." Fastest. | No income, no accounts, no transfers, no real balance. The product promise stays incomplete on purpose. |
| B2. New tabs in the same spreadsheet (`ZIPPP_META`, `Accounts`, `Transactions`, `Bills`). | One file the person already owns. Path to balance and income. | A bug can touch the workbook they already edit. Needs a backup and a written conflict rule before the first write. |
| B3. A second spreadsheet, leave the old one as archive. | Old receipt history stays untouched. | Two sources. People will not know which is true unless the app is very explicit. |

Recommended: **B1 for the next week**, then **B2** only after you have looked at one real personal-expense Sheet (or you hand us a copy of the header row with values redacted). Do not pick B2 in the abstract. The code's default headers may not match a Sheet you customized.

Also decide with B, when you are ready, not before:

- Week starts Monday (current Home assumption) or Sunday.
- Time zone: Asia/Jakarta, Australia/Sydney, or "the zone on the account."
- Cycle start day: 1, 25, or chosen per person. Days 29 to 31 need a clamp rule. Propose: use the last day of the month when the month is shorter.
- IDR has no cents. AUD has cents. Never add them.

### 8.3 Checkpoint C — closed. Drive and Google scopes.

| Option | Recommendation |
|---|---|
| Unapproved photos stay only in the browser until you approve | Yes, until you say otherwise. |
| After approval, upload proof to the user's Drive | Later, with the existing consent story. Not this month. |
| Upload drafts to Drive so a second phone sees the inbox | Needs a manifest, not just pictures, and a scope review. Do not start. |

### 8.4 Checkpoint D — closed. Money you charge.

The live code is prepaid credits: one accept, one credit, failed reads and discard cost zero. Specs also describe a monthly fair-use plan.  

Recommended: **change nothing.** Home and Inbox can be read at zero credits. Capture and review-to-send still require credits. A new income button must not silently spend a credit or silently be free. When you want that button, say which.

### 8.5 Checkpoint E — closed. Production and stores.

No production flag, no Play rollout, no "turn on mobile API." Preview or local only until you ask.

### 8.6 Client strategy — already chosen, restated so it does not drift

Keep the Next.js web app and the Kotlin Android app. An Expo/React Native rewrite is a future spike in a separate directory, not the current build. iOS is not on the clock.

### 8.7 Product choices that can wait, but not forever

| ID | Question | Safe default until you care |
|---|---|---|
| D-09 | Are savings balances typed, or only the result of transfers? | Transfers plus an explicit reconciliation. No silent edit. |
| Coaching | Scores, nudges, "safe to spend" | Out. Do not add. |
| Spaces and goals | Shared ledgers | Parked. Do not delete user data. |
| Android | When does the phone matter? | After web TASK-011 is verified, and only if you want a Mac session. |

---

## 9. What you should provide

Nothing below is a request to paste secrets into chat.

| Need | Why | Enough looks like |
|---|---|---|
| A yes or no on section 8.1 | Otherwise the next agent guesses and wastes a slice | One message: verify 011, which tool, whether to commit code later |
| Header row of one real personal-expense Sheet, values redacted | TASK-005 and Home assume the built-in template | A pasted header list, or "mine matches the template" |
| Permission for one sandbox Google account and a throwaway Sheet, when we leave synthetic mode | Live read is still unverified | "You may read this spreadsheet id" in a task. Not before. |
| Your Mac, later | Android date change and any camera work cannot be compiled here (no Java/Gradle on the pivot host) | A note that you will run the debug build |
| Codex vs Cursor | Luna is capped | Which session continues |
| Billing sentence | So income/expense does not invent a price | "Credits unchanged" is enough for now |

You do not need to provide a React Native decision, a new logo, a coaching model, or a production date.

---

## 10. What we are going to do, in order

This is the sequence if you accept the recommendations. It is not started by this document.

1. **Verify TASK-011** on synthetic accounts. Tests, typecheck, build, browser sign-out/sign-in. Update STATE. Stop.
2. **You choose B1 or B2.** If you do not choose, we stop after step 1.
3. **If B1:** harden the read-only Home against the header row you provided. Still no balance. Still no income.
4. **If B2, after backup rules exist:** P1.4 is a server summary with freshness, still rebuildable if Redis is empty. P1.5 is exactly-once approve, including the old refund-key bug, proven with retries. Only then manual income and expense (S08, S09), then accounts on Home (S13), then the cash-flow tab (S15).
5. **Capture UX** moves from "review immediately" to "shutter, inbox, review later" only after the inbox is account-safe (step 1) and approve-once exists (step 4).
6. **Android** catches up to the web rules you already care about (unknown date, durable queue, account isolation) on your Mac. No new visual redesign in the same slice.
7. **Drive, billing, production** stay closed until their checkpoints are explicit yeses.

What we will not do in parallel: a framework rewrite, a second ledger in Postgres, auto-accept OCR, Spaces, or a paywall experiment.

---

## 11. Flows

### 11.1 Flow a person can actually walk on the web today

```text
Open zippp
  -> Google sign-in
  -> no Sheet yet?  /app/settings/sheet
  -> /app/home
        today + week from receipt rows already in the Sheet
        balance: unavailable
        "N receipts in your inbox" if local photos exist
        Capture button
              |
              +--> zero credits? /app/topup
              |
              +--> /app/snap
                     camera or upload
                     extract on the server
                     unknown fields stay empty
                     review
                     explicit send --> credit + append to their Sheet
                     discard --> no credit
  /app/inbox
        list local queue
        tap one --> that review, no send
        zero credits: list is readable, review links are not
```

TASK-011, once verified, inserts a gate: do not capture until the signed-in user id is loaded; show only that user's drafts; offer a warned import of older unowned drafts; refuse send if the account changed underneath the draft.

### 11.2 Flow the product charter wants, and we have not built

```text
Home
  Spent today | This week | Everyday balance
  Record income | Record expense
  "3 receipts to review" only if some exist
  Latest spending
  header: Synced 2m ago | Syncing | Changes pending | Offline | Reconnect

Capture tab
  shutter
  photo stored locally first
  camera stays open
  OCR later

Inbox
  processing | ready | needs attention | failed
  none of these change today/week/balance

Review
  Save expense --> one pending op --> one Sheet transaction --> then Home moves
  Save and next
  Discard

Cash flow tab
  cycle, money in, money out, upcoming bills
  savings suggestion only when it would not lie
```

### 11.3 System, as built

```text
Browser
  Home -------- GET /api/cashflow/legacy-summary
  Snap/Inbox -- IndexedDB drafts
  Send -------- POST /api/sheets/append
       |
       v
Next.js
  session, credit check, extract pipeline, append
       |                          |
       v                          v
User's personal-expense Sheet   Upstash credits and sessions
(read for totals, append        (not a financial ledger)
 on explicit send)

src/lib/cashflow/model.ts and balances.ts sit beside this.
They are not on the request path.
The photo path does not receive Sheet tokens.
The Sheet path does not call the OCR model.
```

### 11.4 System, as proposed after Checkpoint B

```text
Client (web now, Kotlin later, Expo only if a spike wins)
  encrypted-or-at-least-account-safe drafts
  outbox with a stable op_id
       |
       v
Same Next.js server
  auth, entitlement, approve once, reconcile if the HTTP response is lost
       |                         |
       v                         v
User Sheet                    User Drive
versioned transactions        proof after consent
accounts, bills               (Checkpoint C)
       |
       v
Upstash projection
short-lived, keyed by user + workbook + schema
deletable; Home can be rebuilt from the Sheet
```

Google cannot make a Sheet append and a Drive upload one transaction. The UI has to be able to say "expense recorded, photo still pending." That screen does not exist yet.

---

## 12. Old backlog, so it does not hijack the pivot

`zippp-context-for-claude.md` section 19 still says the next build is FEAT-118, then device proof of Spaces (STORY-102), then production mobile (FEAT-110). That was the Zippp Space plan on 2026-11-03.

| Old id | What it was | Pivot disposition |
|---|---|---|
| DIR-001, FEAT-114, STORY-102 | Shared Space, mates, device proof | Parked. Do not delete data. Not the MVP. |
| FEAT-102, FEAT-115 | Android review contract, notification capture | Not this pivot's queue. Notification capture stays out until the cash-flow web path is true. |
| FEAT-117 | Fair-use subscription meter | Checkpoint D. Do not implement under the pivot. |
| FEAT-103 | Photo proof in Drive | Checkpoint C. |
| FEAT-121 | Import statements | A commit exists on the parent of `v2` (`04268ef`). Not the pivot baseline. Do not extend it in a cash-flow slice. |
| Software Factory | Local Kanban over markdown entities | Paused as the orchestrator. The pivot uses OMP task files instead. |

If an agent quotes FEAT-102 as the next task, it is reading the legacy context file as if the pivot had not happened.

---

## 13. Evidence index

| Claim | Where it is written |
|---|---|
| Baseline commit and your six planning choices | `.zippp-pivot/outputs/TASK-003-DECISION-RECORD-DRAFT.md` |
| 79 tests on that commit | `.zippp-pivot/outputs/TASK-002-BASELINE.md` |
| Models, adapter, balances | `.zippp-pivot/outputs/TASK-004-P1-1-RESULTS.md`, `TASK-005`, `TASK-006` |
| Draft recovery, dates, Home, Inbox | `TASK-007` through `TASK-010` results |
| Current phase sentence | `.zippp-pivot/omp/STATE.md` (local copy may be ahead of this remote until you commit it) |
| OMP stuck | Pane `w34:p1` in workspace `zippp-omp`, agent idle, title still on IndexedDB work, errors `usage_limit_reached` |
| Accounting laws | `.zippp-pivot/docs/04-LEDGER-SYNC.md`, `docs/13-CONTRACTS.md` |
| Screen list | `.zippp-pivot/docs/05-UX-IA.md` |
| Security limits | `.zippp-pivot/docs/07-SECURITY.md` |

---

## 14. Bottom of the board

You are not early in discovery, and you are not near a launch. Discovery and the "do no harm" web reads are largely done. The product you described in the charter starts when Checkpoint B opens, and not before.

Next useful hour is verifying the account split that is already on disk. Next useful decision is whether balance stays honestly blank (B1) or you are ready to design a versioned workbook (B2) against a real header row.
