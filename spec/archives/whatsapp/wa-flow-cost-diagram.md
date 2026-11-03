# zippp WhatsApp — flow, cost optimize, calculator (one diagram)

Status: reference for Meta signup + Preview mock.  
Pricing: Indonesia Service **Rp356.65** / outbound (sheet effective 1 Oct 2026).  
Product law: Sheet = SoR · check before Accept · 1 credit = 1 Accept · ≤2 outbound / Accept.

---

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║  WHAT WE USE ZIPPP WA FOR                                                    ║
║                                                                              ║
║  ICP: Bayu — personal / family cash notes (later RT), one Google owner.      ║
║  Job:  photo / short text on WhatsApp  →  check  →  one row in Google Sheet  ║
║  Not:  marketing blasts, Meta AI budgets, group bot, native app, BSP.        ║
║                                                                              ║
║  Channels:                                                                   ║
║    • Web Snap  = same Accept path, Rp0 Meta                                  ║
║    • WA Cloud  = convenience shutter; Meta Service msgs apply after free tier║
╚══════════════════════════════════════════════════════════════════════════════╝


┌──────────────────────────────────────────────────────────────────────────────┐
│  SETUP (once per user) — not billed per Accept                               │
└──────────────────────────────────────────────────────────────────────────────┘

   [Google signed in] ──► [Sheet connected] ──► [Settings: Link WhatsApp]
                              │                         │
                              │                         ▼
                              │              mock: /app/wa-mock  (WA_MOCK=true)
                              │              live: wa.me / OTP claim (Meta)
                              │                         │
                              └─────────────────────────┴──► state: ready
                                                             (else: need_sheet /
                                                              need_credits /
                                                              unlinked)


┌──────────────────────────────────────────────────────────────────────────────┐
│  HAPPY PATH — one Accept (verbose)                                           │
└──────────────────────────────────────────────────────────────────────────────┘

   USER (WhatsApp)                         ZIPPP / META
   ────────────────                        ─────────────
   1. Sends foto nota / "kopi 25rb"  ──►   inbound webhook
                                           charge: Rp0  (user → business)

                                           checks:
                                             • linked?
                                             • sheet ok?
                                             • credits > 0?
                                             • outbound_month < 800?
                                           if fail → one short ID error CTA
                                                      (still counts as 1 outbound
                                                       if we reply — keep rare)

   2.                            ◄──   OUTBOUND #1  (Service)
                                        Interactive review:
                                          merchant | amount | category | date
                                          buttons: [Terima] [Ubah] [Buang]
                                        charge: Rp356.65  (after free tier)
                                        counter: outbound += 1
                                        state: reviewing
                                        ⛔ NO auto-append
                                        ⛔ NO "sedang dibaca" bubble

   3a. Taps [Terima]             ──►   spend 1 credit
                                       OCR/LLM already done (~Rp3–6)
                                       append row to Google Sheet
                                       on fail → refund credit; short error

                             ◄──   OUTBOUND #2  (Service)
                                        "Tersimpan" + Open Sheet link
                                        charge: Rp356.65  (after free tier)
                                        counter: outbound += 1
                                        state: ready

   3b. Taps [Buang]              ──►   discard draft
                             ◄──   optional 1 short ack  (prefer: button-only,
                                        zero extra msg if Meta allows)
                                        if ack sent → outbound += 1

   3c. Taps [Ubah]               ──►   ask one edit / resend foto
                             ◄──   keep total ≤2 outbound for the Accept
                                        (edit in same thread; don't stack
                                         confirm bubbles)


   META PER ACCEPT (paid tier) = OUTBOUND#1 + OUTBOUND#2
                               = 2 × Rp356.65
                               = Rp713.30

   ZIPPP PER ACCEPT            = 1 credit (your pack pricing)
                               + ~Rp3–6 LLM/OCR


┌──────────────────────────────────────────────────────────────────────────────┐
│  STATE MACHINE (compact)                                                     │
└──────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────┐
                    │ unlinked│──link──►┌───────┐
                    └─────────┘         │ ready │◄──────────────┐
                                        └───┬───┘               │
                         foto/text           │                  │
                         + all checks ok     ▼                  │
                                        ┌──────────┐            │
                                        │reviewing │──Terima──► append
                                        └────┬─────┘            │
                                   Buang/Ubah│                  │
                                             └──────────────────┘

   blocked paths (reply once, no extract):
     need_sheet | need_credits | blocked_quota (outbound ≥ 800)


┌──────────────────────────────────────────────────────────────────────────────┐
│  HOW WE OPTIMIZE COST (priority order)                                       │
└──────────────────────────────────────────────────────────────────────────────┘

   1. USER-INITIATED ONLY
      User writes/sends first → replies stay Service (Rp356.65).
      Never open with Marketing template (Rp586.33) for family notes.

   2. HARD CAP: ≤2 OUTBOUND / ACCEPT
      Review+buttons + Saved. No progress spam. No nudges. No weekly digests.

   3. SOFT KILL-SWITCH: 800 OUTBOUND / MONTH / NUMBER
      Leaves ~200 headroom under Meta’s ~1,000 free Service msgs.
      At 800 → ID message "kuota WA bulan ini habis", stop new extracts.

   4. ONE RICH CARD, NOT MANY BUBBLES
      Fields + 3 buttons in a single interactive message.

   5. NEVER USE (for this ICP)
      Marketing | Auth | Auth-international | Meta Business Agent tokens
      Group messaging | Calling | reminder campaigns

   6. PREFER WEB WHEN CHEAPNESS MATTERS
      Same Sheet + credit path; Meta = Rp0 on Snap.

   7. INVITE-ONLY WHILE ON FREE TIER
      Soft-cap ~400 Accepts/mo stays inside free if always 2 msgs each.


┌──────────────────────────────────────────────────────────────────────────────┐
│  PRICING INPUTS (Indonesia, your Meta sheet)                                 │
└──────────────────────────────────────────────────────────────────────────────┘

   Category                    IDR / business-sent msg
   ─────────────────────────   ───────────────────────
   Service  ← WE USE THIS      356.65
   Utility                     356.65
   Authentication              356.65
   Marketing  ← AVOID          586.33
   Auth-international ← AVOID  1940.13

   Inbound (user → us)         0
   Free Service bucket         ~1,000 msgs / mo / number  (Meta starter; confirm in BM)
   Soft-cap we enforce         800 outbound / mo


┌──────────────────────────────────────────────────────────────────────────────┐
│  CALCULATOR                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

   Let:
     A  = Accepts completed via WA in the month
     O  = outbound Service messages sent  (design: O ≈ 2A)
     F  = free Service msgs remaining     (assume F = 1000 at month start)
     P  = Rp356.65                        (Service unit price)

   Outbound:
     O = 2 × A     (happy path; Buang/Ubah may add — treat as waste, minimize)

   Free vs paid:
     O_free = min(O, F)
     O_paid = max(0, O − F)

   Meta messaging cost (IDR):
     META = O_paid × P
          = max(0, 2A − 1000) × 356.65

   Accepts fully inside free tier:
     A_free_max = floor(F / 2) = 500

   Soft-cap Accepts (our kill-switch):
     A_soft_max = floor(800 / 2) = 400
     → META ≈ Rp0 if F ≥ 800

   After free exhausted:
     META_per_Accept = 2 × 356.65 = 713.30
     META            = (A − 500) × 713.30     for A > 500


┌──────────────────────────────────────────────────────────────────────────────┐
│  WORKED TABLE                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

   Accepts A    Outbound O    vs free 1000     Meta IDR (approx)
   ─────────    ──────────    ────────────     ─────────────────
      100          200         inside free            0
      400          800         soft-cap hit           0
      500        1,000         free exhausted         0
      600        1,200         200 paid         71,330
    1,000        2,000       1,000 paid        356,650
    1,000*       2,000       if no free tier   713,300   (*worst case)

   *If Meta free bucket is 0 for your number, every Accept = Rp713.30 Meta.


┌──────────────────────────────────────────────────────────────────────────────┐
│  FULL UNIT COST AFTER FREE TIER (infra only)                                 │
└──────────────────────────────────────────────────────────────────────────────┘

   Meta WA (2 × Service)     Rp 713.30
   LLM / OCR                 Rp   ~5
   ─────────────────────     ────────
   Infra / Accept            ~Rp 720

   + 1 zippp credit          (your pack price — product revenue, not Meta)


┌──────────────────────────────────────────────────────────────────────────────┐
│  FLAGS / WHERE THIS RUNS                                                     │
└──────────────────────────────────────────────────────────────────────────────┘

   Local / Preview mock:   WA_MOCK=true          → browser playground, Rp0 Meta
   Live WA (later):        WA_CHANNEL_ENABLED=true + Meta secrets on Preview
   Production www:         keep OFF until Preview proven

   Preview URL (mock):
   https://zippp-link-git-feat-wa-mock-preview-masjames-projects.vercel.app
   Path: Settings → Open mock WhatsApp  ·  or  /app/wa-mock


┌──────────────────────────────────────────────────────────────────────────────┐
│  ONE-LINE SUMMARY                                                            │
└──────────────────────────────────────────────────────────────────────────────┘

   User pays convenience; we pay Meta only on bot replies.
   Design = 2 Service msgs / Accept, soft-stop at 800 → ~400 Accepts/mo
   inside the free bucket; after that ~Rp713 Meta per Accept. Never Marketing.
```
