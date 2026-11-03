# Handoff — Twilio WhatsApp transport for zippp

Use this file as the **entire context** for a fresh Cursor agent. Do not need prior chat.

## Goal

Implement Twilio WhatsApp as an alternate transport to Meta Cloud API direct, starting with **Twilio Sandbox**, behind flags. Do **not** enable on production `www.zippp.link` until Preview works. Keep existing Meta mock (`WA_MOCK`) and Meta path intact.

## Product (unchanged)

- ICP: personal/family cash notes (Bayu); Sheet = SoR; check before Accept; 1 credit = 1 Accept.
- Flow: link phone → user sends foto/text → extract → review + [Terima|Ubah|Buang] → Accept appends Sheet → “Tersimpan” + link.
- Hard rule: **≤2 outbound business msgs / Accept**. Soft-cap **800 outbound/mo**.
- No marketing templates for v1 if avoidable; Utility quick-reply template OK if Twilio/Meta require buttons.
- Fallback: plain text `Terima / Ubah / Buang` or A/E/D inside 24h window.

## Repo / branch

- Path: `/Users/mm/Dev/adit/zippp`
- Branch with WA mock: `feat/wa-mock-preview` (pushed)
- Preview: `https://zippp-link-git-feat-wa-mock-preview-masjames-projects.vercel.app`
- Preview env already: `WA_MOCK=true` (Preview only)
- Existing WA code:
  - `src/lib/wa/{config,handler,meta,store}.ts`
  - `src/app/api/wa/{webhook,link,link/claim}/route.ts`
  - `src/components/app/{WaLinkPanel,WaMockClient}.tsx`
  - `src/app/app/wa-mock/page.tsx`
- Flow/cost docs: `spec/plans/wa-flow-cost.html`, `wa-flow-cost-diagram.md`, `tonight-family-wa.md`

## Kendall (Twilio AI) facts we trust

- Sandbox: first test message today (~10–20 min). Join code → Sandbox number.
- Production still needs Meta WABA / verification (Twilio does not skip Meta).
- Minimal product: **Programmable Messaging API** + webhooks. Skip Conversations/Studio for MVP.
- Twilio fee: **$0.005 / msg** in or out → ~$0.015/Accept → ~$6/mo @ 400 Accepts.
- Meta fees still apply on top; our Meta IDR sheet (1 Oct 2026) lists Indonesia **Service Rp356.65** — do not assume Meta free-form is always $0.
- Buttons: often Utility template + quick replies; else text fallback.

## Implementation ask (agent)

1. Add transport flag, e.g. `WA_PROVIDER=meta|twilio|mock` (or `WA_TWILIO_ENABLED` + keep `WA_MOCK`).
2. Twilio webhook route (new or adapter on `/api/wa/webhook`) validating Twilio signature; parse inbound text/image (`MediaUrl0`); map button payloads into existing FSM in `handler.ts`.
3. Twilio send helpers: text + (template or interactive) for review + saved; reuse handler outcomes; increment same outbound counter.
4. `.env.example` keys (no secrets committed):
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+14155238886` sandbox)
   - `WA_PROVIDER` / enable flags
5. Keep Meta path compilable; Preview-only env for Twilio; Production untouched.
6. Short README section or note in `tonight-family-wa.md`: Sandbox setup steps + webhook URL.
7. `npx tsc --noEmit` green. Prefer thin adapter over rewriting FSM.

## Out of scope

- Production WABA onboarding, BSP shopping, Studio flows, marketing templates, turning on www.zippp.link.

## User signup (parallel — not agent)

User obtains from Twilio Console (Sandbox first):

1. Account SID + Auth Token
2. WhatsApp Sandbox number + join code
3. Public HTTPS webhook URL (Vercel Preview or tunnel) → “When a message comes in”
4. Later (prod): WhatsApp Sender / WABA — still Meta-gated

## Done when

- Sandbox inbound hits our route; handler can reply via Twilio API.
- Flags documented; build/tsc green; no Production env flips.

---

## Sandbox setup (Preview only — never Production)

1. Twilio Console → Messaging → Try it out → Send a WhatsApp message  
   Copy **join code** + Sandbox number (`whatsapp:+14155238886`).
2. Account → API keys: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
3. Vercel **Preview** env (feat branch), not Production:
   ```
   WA_CHANNEL_ENABLED=true
   WA_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=…
   TWILIO_AUTH_TOKEN=…
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```
   Keep `WA_MOCK=true` if you still want the browser playground.
4. Sandbox → “When a message comes in” → HTTP POST.  
   Preview has Vercel SSO (`all_except_custom_domains`). Append automation
   bypass (Project Settings → Deployment Protection → Protection Bypass), e.g.  
   `https://zippp-link-git-feat-wa-twilio-sandbox-masjames-projects.vercel.app/api/wa/webhook?x-vercel-protection-bypass=<SECRET>`  
   Signature validation includes the query string (`webhookPublicUrl`).
5. Phone: join Sandbox (`join <code>`), then Settings → Hubungkan WhatsApp →  
   send `zippp link <token>` (or wa.me deep link) → photo → Balas Terima/Ubah/Buang.

Webhook path (both providers): **`/api/wa/webhook`**.

### Preview env gap (as of handoff agent)

Set **Preview only** (not Production): `WA_CHANNEL_ENABLED=true`,
`WA_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_WHATSAPP_FROM`. `WA_MOCK=true` may stay for the browser playground.
