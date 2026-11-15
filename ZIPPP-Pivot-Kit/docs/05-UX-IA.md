# 05 — Information Architecture, Complete Screen System and Copy

**Design posture:** restrained ZIPPP, native platform fluency, no decorative noise, one dominant action per task. The prototype in `reference/ZIPPP-Prototype-v0.8.html` is a visual reference, not an immutable technical implementation.

## Global navigation

**Bottom tabs:** `Home` / `Capture` / `Cash flow` (capture icon bolder and record-like).  
**Account icon:** identity, Accounts, Settings, permissions.  
**Sync beside account:** `Synced · 2m ago`, `Syncing…`, `Changes pending`, `Offline` or actionable error.  
**Activity:** enters from Home's `Latest spending → View all`, not a persistent bottom tab.

**Always preserve:** safe areas, back behavior, keyboard avoidance, 48dp touch targets on Android / 44pt on iOS, accessibility labels, screen reader order and dynamic text sizing.

## Home: exactly the chosen hierarchy

```text
zippp.                      [sync · 2m] [account]

+----------------------------------------------+
| Spent today                 This week         |
| Rp74.000                    Rp612.000         |
|                             Balance           |
|                             Rp4.250.000       |
+----------------------------------------------+

[ wallet +  Record income ] [ wallet -  Record expense ]

3 receipts to review                         [Review]  (only if pending)

Latest spending                                  View all
Lunch                                            −42.000
Coffee                                           −32.000
Fuel                                            −120.000

[Home]             [● Capture]             [Cash flow]
```

The illustrative amounts are not product defaults. **No action buttons inside the three summary compartments.** The hero and right column must remain legible on narrower phones and for large accessibility text; use responsive stacking if side-by-side would clip. Do not append pointless hints such as “Based on recorded accounts · Updated locally.” If data is stale, inconsistent or incomplete, show a **truthful, actionable status** via the sync control or localized information indicator.

## Screen inventory (user-journey order)

| ID | Screen | Primary job | Key content/actions | Exit |
|---|---|---|---|---|
| S01 | Welcome/demo | understand without commitment | simple promise; sample snapshot clearly labelled example; sign in | S02 |
| S02 | Sign in | establish identity | Google login on all platforms, alternative if retained | S03 |
| S03 | Google grant/Sheet setup | connect user-owned storage | choose/create Sheet; explain permissions plainly | S04 |
| S04 | Home | instant awareness | Today / Week / Balance, buttons, latest spending, pending receipt status | Capture, Cash flow, Activity |
| S05 | Capture | acquire a receipt rapidly | viewfinder, one prominent shutter, retake/close if needed, inbox count | Inbox, Home |
| S06 | Receipt Inbox | review at leisure | captured/processing/ready/failed list with thumbnails; sort latest | S07 |
| S07 | Receipt Review | verify & approve | image, amount, merchant, date, account, optional category, flags | Save, Save & next, Discard |
| S08 | Manual expense | record spending | amount, account, date, merchant optional, category optional | Home/Activity |
| S09 | Manual income | record funds received | amount, destination account, date, source optional | Home/Activity |
| S10 | Activity | inspect confirmed transactions | search, date, filter, categories, latest first | S11, Home |
| S11 | Transaction detail | trust & correct | source, account, date, edit/reverse, receipt link | Activity |
| S12 | Spending details | understand today/week | period, rows, optional simple grouping, no gamified score | Home |
| S13 | Accounts & balance | explain money held | everyday accounts list; `Show savings` subtle reveal; transfers | S14 |
| S14 | Transfer/reconcile | move funds without fake spending | from/to, amount, confirmation; adjustments | Accounts |
| S15 | Cash flow | understand upcoming cycle | cycle start day, previous/next cycle, money in/out, bills/invoices, saving option | S16/S17 |
| S16 | Bill/invoice detail | record and remember obligations | due date, amount, recurrence, optional reminder, mark paid | Cash flow |
| S17 | Savings | preserve reserved money separately | savings account balance, optional goal, transfer in/out, no pressure | Accounts / Cash flow |
| S18 | Settings & sync | user control and reliability | sync status, Google grant, notification preference, privacy, sign-out | previous |

Existing paired-device / Space / legacy quota screens may remain as compatibility flows but are not in primary MVP navigation.

## Camera experience

Capture is a **dedicated tab**, not hidden behind a form. A quiet viewfinder, one bold capture control and a subtle inbox count. After shutter, capture confirmation appears instantly and the camera remains ready for another image. OCR continues regardless of whether user leaves. Do **not** require review immediately. Camera auto-detection is an optional enhancement; reliable manual shutter is the baseline.

## Receipt Inbox

Items are grouped by status, but visually lightweight. A ready receipt can show merchant and amount **if OCR confident**, else `Receipt ready · Check details`. A failure offers `Try again` / `Enter manually`. Pending approval never changes confirmed totals. A discreet Home prompt may say `3 receipts to review` without alarmist urgency.

## Receipt Review

The image provides recognition context, extraction fills fields progressively. Order: **amount** (largest), merchant, date, account, optional category, receipt details collapsed. Unknown values stay blank, estimated date labelled as assumed, uncertain amount highlighted. Defaults are not silently misrepresented as user-confirmed. Bottom pinned primary action **Save expense**, secondary **Save & next** if inbox has another item, tertiary **Discard**. On approval immediately show the saved/pending sync state and enable the next scan.

## Cash flow screen: unconventional but understandable

The screen should not resemble a budgeting spreadsheet. It is a temporal picture of **this pay cycle**, using a clean period rail:

```text
Cash flow                           [cycle: starts 25th]
<  25 Oct – 24 Nov  >

Money in                   Money out
Rp...                      Rp...

Coming up
  Internet · 20 Nov · Rp...
  Rent · 25 Nov · Rp...
  [+ Add bill / invoice]

Savings
  Keep some aside              [Move to savings]
  Reserved money hidden on Home; tap Accounts → Show savings
```

Cycle start can be any approved day 1–31 and should be explicit in settings. Expenses after the cycle end belong to next cycle, regardless of calendar month. Payment reminders are opt-in, skippable, and linked to a specific obligation; overdue wording is neutral. The savings suggestion must not appear when money is insufficient or uncertainty is high, and no “safe to save” assertion without sufficient facts.

## Content / interaction rules

- Do not ask “where did my money go?” on the initial Home; reveal actionable numbers directly.
- Use a small number of understandable nouns: **Spent today, This week, Balance, Latest spending, Capture, Inbox, Cash flow, Accounts, Show savings, Record income, Record expense, Save expense**.
- No “safe to spend” label; avoid suggesting ZIPPP decides affordability.
- No success animation for mere scanning that implies the money is already recorded.
- Never show arbitrary financial health scoring, color-coded fear, shame, streaks or nagging.
- Loading states preserve layout, avoid fake values; clear empty states invite one next action.
- All confirmation toast messages must be conditional on the correct write stage: `Captured`, `Saved locally`, `Recorded in Sheet`, or `Sync pending`.

## Accessibility / internationalization

- Use label + number, not color alone. Ensure mixed RP/AUD amounts use correct locale formatting while maintaining canonical minor-unit storage.
- VoiceOver/TalkBack summary order: status first if consequential, today amount, week amount, balance, record actions, pending receipts, latest transactions.
- Dynamic text can stack home compartments. Never truncate amount without a disclosed full-value accessible label.
- Touch targets and contrast are tested; icons must have accessible names (`Record expense`, not `arrow-out`).
- Strings remain maintained in the existing `spec/wording.txt` or a migrated typed translation layer with a compatibility generator. Do not scatter copy as literals.
