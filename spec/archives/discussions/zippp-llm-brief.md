# zippp — LLM transfer brief (single doc)

**Use:** Paste this whole file into another LLM for product/architecture discussion.  
**Updated:** 2026-10-21.  
**Repo:** `github.com/masjames/zippp.link` · Live: `www.zippp.link` (EN/USD) · `www.zippp.link/id` (ID/IDR).  
**Owning specs (deeper detail):** `spec/SPEC.md`, `USER-FLOW.md`, `ARCHITECTURE.md`, `TEMPLATES.md`, `PRICING.md`, `wording.txt`, `AUDIT-2026-10.md`, `AGENTS.md`.  
**This file wins for “what are we doing right now.”** Specs win for contracts; if they conflict on Rev2 sheet layout vs WA plans, say so explicitly.

---

## 1. One sentence

Photograph a receipt / nota (or short expense text), zippp extracts fields, the human checks, then zippp appends row(s) into **the user’s own Google Sheet**. Sheet = system of record. zippp is intake, not a second ledger.

---

## 2. Product laws (non-negotiable)

1. **Sheet = SoR** — no parallel receipt ledger in zippp.
2. **Check before Accept/Send** — never auto-write.
3. **Never invent** — unknown stays empty / flagged.
4. **1 credit = 1 successful Accept** — spent on append success; refund on fail; failed read costs nothing.
5. **All user-visible copy** in `spec/wording.txt` (EN/ID). No hardcoded UI strings.
6. **No em dashes / hype** in user-facing text.
7. **Credits & admin on server only** — never trust the browser for balance/admin.
8. **Images:** device IndexedDB for batch only; optional proof → **user’s Drive**, not zippp servers.
9. **Secrets:** never commit/print `.env`; no `NEXT_PUBLIC_` for secrets.

---

## 3. Who / templates

| Persona | Template id | Job |
|---|---|---|
| Sonny | `resto-inventory` | Resto/warung purchasing notas → kitchen sheet |
| Bibian | `personal-expense` | Personal spend tracking |
| Fais | `sales-recap` | Daily sales from paper notas |
| Bagas | `reimbursement` | Claims + optional Drive photo proof |
| (any) | `custom` | User’s own headers |

**Not building:** Accurate/Jurnal/Xero clone, P&L, bank feed, stock deduction, inventory truth.

---

## 4. Heading direction NOW (2026-10)

Evidence-led pivot (Bayu / Alya chats):

| Priority | Direction |
|---|---|
| **ICP hero messaging** | Personal + **family cash notes** (later RT), one Google owner — not only resto purchasing |
| **Wizard UX** | Short labels + icons + mini sheet peek (Alya: long “Saya…” copy fails) |
| **Capture channel** | **WhatsApp as shutter** (no native app). Web Snap remains. |
| **WA transport** | Meta Cloud API direct **and/or Twilio Sandbox** behind flags. **Production WA dark** until Preview proven. |
| **Rev2 sheet** | Still decided in `AUDIT-2026-10.md` (month tabs, Summary, daily formulas, staff/outlet in review, Rp15k entry) — partially product-decided, build status varies; do not assume all shipped |

**Out of tonight / near-term WA scope:** ADK/conversation engine, Meta AI clone as SoR, BSP shopping, marketing WA blasts, group bot, asset tracker, full RT multi-member roles.

---

## 5. Core user flows

### Web (shipped spine)

```
Land → Google OAuth → connect/create [zippp] Sheet + pick template
  → Snap (camera/batch) → extract → review card → Accept
  → 1 credit − → append Sheet (optional Drive proof)
  → Top-up when credits = 0 (ID: Kasera QRIS; intl: Paddle)
```

Guard: signed-in; sheet required; zero credits → top-up (settings reachable).

### WhatsApp MVP (built behind flags; Preview)

```
Link phone ↔ Google (magic token / claim)
  → user sends foto or short text          (inbound Rp0 Meta; Twilio $0.005)
  → extract → OUTBOUND #1 review + [Terima|Ubah|Buang]
  → Terima → credit + Sheet append
  → OUTBOUND #2 “Tersimpan” + Sheet link
Hard: ≤2 outbound / Accept · soft-cap ~800 outbound/mo · no “sedang dibaca”
Ubah → web Snap CTA · Buang → drop draft
Text fallback: user replies Terima/Ubah/Buang if no template buttons
```

States: `ready | reviewing | blocked_quota | need_sheet | need_credits | unlinked`.

### Browser mock

`WA_MOCK=true` → Settings “Open mock WhatsApp” / `/app/wa-mock` (no Meta/Twilio).

---

## 6. Stack & code map

| Layer | Choice |
|---|---|
| App | Next.js App Router, TS, Tailwind → Vercel (`zippp-link`) |
| Auth / Sheet | Google OAuth (`spreadsheets` + `drive.file`), Sheets append |
| Session KV | Upstash Redis REST → Blob → filesystem (`src/lib/google/kv.ts`) |
| Credits / orders | Upstash Redis (separate), Kasera QRIS (ID), Paddle (intl), Telegram admin |
| Extract | PP-OCRv6 → DeepSeek Flash → verifier → Gemini last resort (`src/lib/extract-pipeline.ts`) |
| WA | `src/lib/wa/*` · `src/app/api/wa/webhook|link|link/claim` · UI `WaLinkPanel`, `WaMockClient` |
| Copy | `spec/wording.txt` via `src/lib/content.ts` |

### Extract pipeline (always-on debug trace)

```
photo → PP-OCRv6 → indexed rows → DeepSeek Flash → verifier → receipt JSON
         └ fail → DeepSeek vision → Gemini last resort
```

Verifier grounds amounts/dates/merchant in OCR; ungrounded → null + flags.

### WA flags / env (names only)

```
WA_CHANNEL_ENABLED=true|false     # dark unless exact "true"
WA_PROVIDER=meta|twilio|mock
WA_TWILIO_ENABLED=true            # alt → twilio
WA_MOCK=true
WA_SERVICE_MSG_SOFT_CAP=800
META_WA_ACCESS_TOKEN / PHONE_NUMBER_ID / VERIFY_TOKEN / APP_SECRET
TWILIO_ACCOUNT_SID / AUTH_TOKEN / WHATSAPP_FROM / CONTENT_SID_REVIEW?
```

Webhook: `GET/POST /api/wa/webhook` (Meta verify + JSON **or** Twilio form + signature).  
Replies via REST (not TwiML). Production: **do not** set `WA_CHANNEL_ENABLED=true` until Preview OK.

---

## 7. Money

| | Indonesia `/id` | International `/` |
|---|---|---|
| Unit | Rp 150 / credit | Pack 100 credits / $9 (Paddle) |
| Entry | Rp 15.000 = 100 scans (invite may Rp 10k) | one-time pack |
| Pay | Kasera QRIS (+ GoPay fallback) | Paddle |
| Lots | 30-day expiry; spend earliest lot first | same idea |
| Referral | Referrer 20% of referred top-ups (credits); referred +20 once after first top-up | same |
| Free tier | None for product credits (referral only free grant) | none |

**WA messaging cost (planning):** Indonesia Meta Service ~**Rp356.65**/outbound (rate card 2026-10-01). Design **2 × Service ≈ Rp713 / Accept** after free bucket. Twilio adds **~$0.005/msg** (~$0.015/Accept; ~$6/mo @ 400 Accepts). Soft-cap 800 outbound aims to stay inside Meta ~1k free Service msgs if that bucket still applies — verify in BM; do not assume Meta in-window is always $0.

---

## 8. Repo / deploy state (as of brief date)

| Item | State |
|---|---|
| Live production | Web Snap + billing path; **WA off** by default |
| Branch `feat/wa-mock-preview` | Mock WA + short template wizard |
| Branch `feat/wa-twilio-sandbox` | Twilio transport + Meta path + mock; active work branch |
| Preview alias (Twilio) | `https://zippp-link-git-feat-wa-twilio-sandbox-masjames-projects.vercel.app` |
| Webhook for Sandbox | `…/api/wa/webhook` |
| Agent rules | Root `AGENTS.md` |

---

## 9. Revision 2 (decided; build separately from WA)

From `AUDIT-2026-10.md` — do not forget in roadmap talks:

- Five templates + persona wizard copy  
- One spreadsheet: **month tabs** by receipt date, `Summary`, daily formula block, hide tabs >12 months  
- Staff/outlet in **review card** + Settings  
- Photo proof → user Drive (esp. reimbursement)  
- Header credit pill; Accept cost; landing persona cards; Rp15k preset  

WA work must not break Snap / Kasera / Paddle contracts.

---

## 10. Open tensions (good discussion fuel)

1. **ICP:** resto purchasing (historical) vs family/personal WA (current growth bet) — landing/offer copy may lag code/plans.  
2. **Buttons on WA:** Meta/Twilio often want Utility templates for quick replies vs text `Terima/Ubah/Buang` (faster, worse UX).  
3. **Meta vs Twilio:** Twilio Sandbox = faster test; production still Meta/WABA-gated; Twilio fee on top.  
4. **Meta Service pricing vs “free in 24h window”** claims — reconcile with current IDR rate card before unit-econ.  
5. **Rev2 month-tab sheet** vs shipping WA first — sequencing / scope risk.  
6. **Credits vs Meta msg cost** after free tier — WA Accept infra can exceed credit price; invite-only + soft-cap is the control.

---

## 11. What to tell another LLM *not* to invent

- Do not assume WA is live on `www.zippp.link`.  
- Do not assume month tabs / Drive proof / staff UI are fully shipped — check code vs audit.  
- Do not propose BSP, Studio-as-SoR, or marketing WA for v1.  
- Do not move business logic that belongs in extract/credits/append into the client.  
- Do not hardcode copy outside `wording.txt`.

---

## 12. Suggested discussion prompts

- Stress-test family-finance ICP vs resto personas for landing + template order.  
- Compare Meta-direct vs Twilio for invite-only ID volume (~400 Accepts/mo).  
- Sequence: WA Preview soft-launch vs Rev2 sheet layout.  
- Design ≤2-outbound review UX with/without Utility templates.  
- Unit economics: credit price vs Meta Service + Twilio + OCR after free tier.

---

## 13. File index (if you can open the repo)

| Path | Role |
|---|---|
| `spec/SPEC.md` | Product requirements |
| `spec/USER-FLOW.md` | Ordered flows |
| `spec/ARCHITECTURE.md` | Stack + pipeline + stores |
| `spec/TEMPLATES.md` | Columns / sheet shapes |
| `spec/PRICING.md` / `OFFER.md` / `COGS.md` | Money |
| `spec/AUDIT-2026-10.md` | Rev2 decisions + task order |
| `spec/plans/tonight-family-wa.md` | Family + WA MVP brief |
| `spec/plans/twilio-wa-handoff.md` | Twilio Sandbox handoff |
| `spec/plans/wa-flow-cost.html` | Screen + data + cost wireframe |
| `spec/wording.txt` | All UI strings |
| `AGENTS.md` | Implementer rules |

**End of brief.** Prefer citing section numbers when answering.
