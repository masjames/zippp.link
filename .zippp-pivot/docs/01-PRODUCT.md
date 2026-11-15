# 01 — Product Charter and Lean Business Scope

**Status:** proposed target direction, synthesized from the user's November 2026 decisions.  
**Version:** ZIPPP vNext / cash-flow-first pivot.

## Promise and positioning

**Vision:** ZIPPP, your best friend for financial well-being.  
**Practical position:** The easiest way to see and understand your everyday money without the work of budgeting.  
**Core job:** Let the user notice spending, understand what is available, and decide on their own terms.  
**Emotional reward:** increasing familiarity, confidence and autonomy; not fear, shame, streaks or app dependence.

## One-page lean canvas

| Dimension | Target |
|---|---|
| Problem | Transactions are scattered, cash movement is hard to remember, daily tracking is tedious. |
| First audience | Salaried adults with money-related uncertainty who dislike formal budgeting; first tests Indonesia and Australia. |
| Value | Today's spending, this week's spending and available cash in one glance, with nearly effortless capture. |
| Product | Manual income/expense, receipt camera + deferred review, activity, account balances, monthly cash flow, bills, dedicated savings accounts. |
| Acquisition | Localized content around relatable money moments, demo and referrals; 20 qualified interviews per market before scaling. |
| Revenue | Paid service/automation hypothesis, not proof of recurring demand; existing subscription logic reviewed rather than assumed. |
| Costs | Extraction, storage, auth, Google APIs, sync, support, payments, compliance, product engineering. |
| Primary success | Accurate first useful snapshot, completed capture-to-approval, reliable repeat usage; ultimately sustainable financial outcomes. |
| Differentiator to build | Trustworthy, user-controlled records, low friction and clear explanations of what is known or missing. |

## Hard product boundaries

### Now, MVP

- Multi-account **cash and cash-like** balances; banks, e-wallets, cash, and separate accessible savings accounts.
- Capture photos to a receipt inbox. Extraction may finish later. Review/approval writes a new expense exactly once.
- Income and expense entry, corrections, account-to-account transfers, basic reconciliation.
- Accurate **Spent today**, **This week**, and **Balance** plus latest spending, each drillable.
- User-customized cash-flow cycle with start-day, upcoming bills/invoices, and opt-in reminders.
- Savings visible on request (“Show savings”); moving money into savings does not count as spending.
- User-owned Google Sheet for confirmed ledger, Google Drive for proof images, encrypted local pending queue, Upstash for cached read projections.
- Online, syncing, pending and offline statuses that describe reality.

### Later, only if research supports

- Active behavioral coaching and validated well-being measurement, with voluntary multiple-choice probing.
- Automatic bank/e-wallet aggregation where supported and consented; CSV/XLSX import after core recording works.
- Couples/Spaces, multi-user shared ledgers, investments/crypto/gold, lending and financial-product partnerships.
- Rich subscription tiers and automation beyond a demonstrated paid user outcome.

### Explicitly out of MVP

- Portfolio performance dashboards, net-worth scoring, stock trading, advice to buy/sell financial products.
- Scolding alerts, fabricated safety ratings, mandatory daily check-ins, intrusive questionnaires.
- Restaurant inventory, sales recap, reimbursement-specific templates or multi-persona receipt mills.
- Dependence on an AI chat interface or automatic acceptance of OCR results.

## UX principles with behavioral rationale

1. **Recognition over recall:** show short transaction descriptions and receipt thumbnails, not a form to recreate a receipt.
2. **Progressive disclosure:** prominent today/week/balance; recent entries below; detail on tap.
3. **Autonomy:** no “you can safely spend X” verdict as a general home indicator; the user decides.
4. **Minimum action:** one shutter, draft safely stored, optional review later.
5. **Feedback and status visibility:** capture saved, extraction running, pending approval, awaiting sync, fully synced are distinct.
6. **Error prevention:** inspect uncertain OCR values, prevent double entry, clearly distinguish transfer vs expenditure.
7. **Quiet by default:** no coaching unless there is a useful, permissioned action. Never optimize attention time as well-being.
8. **Information integrity:** if a balance is partial, do not imply complete coverage.

## Home's job

In approximately one glance:

- Hero: **Spent today**, showing recorded confirmed spending only.
- Beside hero: **This week** and **Balance** as compact figures, no buttons inside any summary compartment.
- Under the summaries: **Record income** and **Record expense**, clearly distinguished wallet-in and wallet-out icons.
- Under that: receipt inbox prompt only when useful and **Latest spending** with **View all** linking to Activity.
- Navigation: **Home / Capture / Cash flow**. Capture uses a bold, record-button-like scanner symbol; Activity is not a tab.
- Header: wordmark + compact sync-status control beside account icon. Status must be true: synced n minutes ago / syncing / changes pending / offline. Tap to sync.

## Savings boundary

Everyday balance excludes savings accounts classified as reserved, even though total cash assets can be inspected via Accounts. Savings should be accessible but **not silently added back into everyday spendable balances**. A savings move is a transfer with exactly two account legs, not an expense and not income. Encourage separate storage through neutral wording and an optional reminder, not pressure to save what the person cannot afford.

## Measurement and experiments

- Activation: percentage of users reaching a meaningful confirmed snapshot within first use (do not count fake demo data as activation).
- Quality: duplicate rate, sync divergence, inaccurate OCR confirmations, conflict and recovery rate.
- User effort: median taps/seconds from opening camera to securely storing draft; median review actions for a clear receipt.
- Retention: confirmed repeated useful financial understanding and user-reported utility, not maximum DAU.
- Financial well-being: measured separately with an appropriately validated instrument if that project is approved; never derive a clinical-style score solely from transaction rows.

## Open questions

- Confirm commercial model and when to introduce paywall; older uploaded docs use subscription tiers but user tests may favor different outcomes.
- Confirm whether savings account balances should be editable manually or only reconciled via transactions.
- Confirm default locale and multi-currency handling for Australia vs Indonesia (recommend explicit account currency and no mixed-currency arithmetic without conversion evidence).
