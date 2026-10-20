# Tonight plan — family finance focus + visual wizard + WhatsApp MVP

Status: **ACTIVE** — build tonight. Owning product specs stay in SPEC / USER-FLOW /
ARCHITECTURE / TEMPLATES / PRICING. This file is the build brief for one night.

Evidence: Bayu WhatsApp (pencatatan keuangan, kas keluarga / kas RT, WA habit,
no rekapan); Alya WhatsApp (template list too wordy → short + icons).

---

## 0. Objective (done when)

1. Plan exists (this file).
2. **Sheet baru** wizard: short labels, icons, mini sheet sneak peek; personal
   expense leads the list.
3. **WhatsApp channel** (Meta Cloud API direct) behind `WA_CHANNEL_ENABLED`:
   link phone ↔ Google, photo → extract → Terima / Ubah / Buang, Accept uses
   existing credit + append. Soft kill-switch near 800 outbound service msgs/mo.
4. Current Snap / Kasera / Paddle path unchanged when flag is off.
5. `npm run build` and `npx tsc --noEmit` green.

Out of tonight: asset tracker, RT multi-member roles, ADK/conversation engine,
month-tab Rev2 layout, native app, BSP, group chat bot, Meta AI clone as SoR.

---

## 1. Product law (unchanged)

| Law | Meaning |
|---|---|
| Sheet = SoR | zippp extracts, maps, appends. No second ledger. |
| Check before Accept | No auto-send from WA or web. |
| Never invent | Unknown stays empty. |
| 1 credit = 1 Accept | Spent on append success; refund on fail. |
| Copy in wording.txt | No hardcoded user strings. |
| No em dashes / hype | User-facing text. |

---

## 2. ICP pivot (Bayu) — messaging only tonight

**Hero:** personal + family cash notes (and later RT), one Google owner.

| Keep in product | De-emphasize tonight |
|---|---|
| `personal-expense` template (lead wizard) | Reimbursement as hero story |
| Photo → check → Sheet | Double entry into company forms |
| WA as shutter for lazy notes | Full anggaran / Meta AI budgets |

Wizard order:

1. `personal-expense` (Pengeluaran)
2. `resto-inventory` (Dapur / toko)
3. `sales-recap` (Penjualan)
4. `reimbursement` (Klaim)
5. `custom` (Sheet sendiri)

Landing copy rewrites are later unless a one-line hero tweak is free.

---

## 3. Alya — visual template wizard

### Problem

Long “Saya …” sentences. Chaos users do not read them.

### Target UI

Each template card:

```
┌──────────────────────────────────────┐
│ [icon]  Short title                  │
│         one-line field hint          │
│  ┌────────────────────────────────┐  │
│  │ mini table sneak peek (3 rows) │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Short labels (wording keys)

| id | EN short | ID short | Body stays field hint |
|---|---|---|---|
| personal-expense | My spending | Pengeluaran | Merchant, amount, category |
| resto-inventory | Kitchen buys | Dapur / toko | Supplier, item, staff, outlet |
| sales-recap | Daily sales | Penjualan | Item, qty, nota total |
| reimbursement | Claims | Klaim | Merchant, total, purpose |
| custom | My sheet | Sheet sendiri | Row 1 is the schema |

Reuse `sheet-previews.ts` + a compact `MiniSheetPeek` (do not duplicate preview
data). Map template id → preview kind:

| template | preview |
|---|---|
| personal-expense | expenses |
| resto-inventory | purchasing |
| sales-recap | sales |
| reimbursement | reimbursement |
| custom | expenses (muted) or blank headers “Your columns” |

Icons: simple lucide (Wallet, ShoppingBasket, Receipt, FileImage, Sheet) —
already a dependency.

### Files

- `src/app/app/settings/sheet/page.tsx` — wizard layout
- `src/components/app/TemplatePickCard.tsx` — new
- `src/lib/sheet-previews.ts` — optional `templatePreviewKind()`
- `spec/wording.txt` — short titles; keep body keys

---

## 4. WhatsApp MVP — architecture

### Decision

| Choice | Pick |
|---|---|
| Provider | **Meta Cloud API direct** (no BSP) |
| Interaction | FSM + reply buttons (max 3). No ADK. |
| Edit | **Ubah** → CTA URL to web review (or Snap) |
| Auth | One Google operator; magic link binds `wa_id` |
| Messages / Accept | **2 outbound** (review+buttons, then saved). No “sedang dibaca”. |
| Free budget | 1,000 service msgs/mo/number → ~500 Accepts; kill-switch **800** |
| Async | Webhook returns 200; process via `waitUntil` or QStash if available |

### State machine (Upstash)

```
wa:link:{wa_id}     → { googleUserId, linkedAt }
wa:session:{wa_id}  → { state, scanId?, draft?, updatedAt }
wa:pending:{token}  → { googleUserId, exp }   // magic link
wa:out:{yyyy-mm}    → integer outbound count for number
wa:draft:{scanId}   → receipt JSON + ops (short TTL)
```

States: `ready` | `reviewing` | `blocked_quota` | `need_sheet` | `need_credits` | `unlinked`

### Flow

```
User sends photo
  → verify signature, ack 200
  → resolve link; else send CTA “Hubungkan akun”
  → check sheet + credits; else CTA
  → check outbound counter < 800
  → download media → extract pipeline
  → store draft; send review text + [Terima][Ubah][Buang]
User taps Terima
  → spend credit + append (same as web)
  → increment outbound; send “Tersimpan” + Open Sheet link
User taps Buang → drop draft
User taps Ubah → CTA to `/app/snap` or future review deep link
```

### API / UI surface (new only)

| Path | Role |
|---|---|
| `GET/POST /api/wa/webhook` | Meta verify + inbound |
| `POST /api/wa/link/start` | Signed-in user mints link token |
| `GET /api/wa/link/claim` | Opens from WA / browser; binds wa_id |
| Settings panel | “Hubungkan WhatsApp” when flag on |
| `src/lib/wa/*` | meta client, session, quota, handler |

### Env (names only)

```
WA_CHANNEL_ENABLED=true|false
META_WA_ACCESS_TOKEN
META_WA_PHONE_NUMBER_ID
META_WA_VERIFY_TOKEN
META_WA_APP_SECRET
WA_SERVICE_MSG_SOFT_CAP=800
```

Never `NEXT_PUBLIC_` for secrets.

### Release / non-disruption

**Do not touch live Vercel env or deploy without an explicit go.**

1. **WA is dark by default.** `WA_CHANNEL_ENABLED` must be the string `true`
   to turn on. Missing / `false` / anything else = off. Settings panel hides.
   Webhook POST returns `{ disabled: true }` and does no work. No Meta secrets
   required on prod until you choose to wire them.
2. **Never set `WA_CHANNEL_ENABLED=true` on production** until Meta number +
   webhook are tested on a preview deploy first.
3. Wizard UI (short labels + peek) is the only user-visible change when this
   branch deploys. Snap, Kasera, Paddle, extract, append contracts stay the same.
4. Rollback WA = unset flag (instant). Rollback wizard = revert that commit.
5. Prefer preview deployment (`vercel` preview URL) before promoting to
   `www.zippp.link`.

---

## 5. Cost budget (free-first)

| Item | Tonight assumption |
|---|---|
| Meta service msgs | Free ≤1000/mo; design 2 msgs/Accept |
| Soft cap | Block new WA extracts at 800 outbound |
| OCR | Baidu free quota |
| DeepSeek | ~Rp 3–6/Accept (existing) |
| Upstash / Vercel | Existing free/hobby |

After free Meta tier, WA Accept costs ~Rp 713 messaging alone vs Rp 150 credit —
**do not scale WA without price change**. Invite-only until proven.

---

## 6. Build order (one lane)

| # | Task | Verify |
|---|---|---|
| 1 | This plan | File exists |
| 2 | wording short labels + WA strings | keys present EN/ID |
| 3 | TemplatePickCard + wizard reorder | visual in `/app/settings/sheet` |
| 4 | `src/lib/wa/*` + webhook stub + signature | unit-ish; flag off = no-op |
| 5 | Link start/claim + Settings UI | bind in Upstash |
| 6 | Photo → extract → buttons → append | manual with Meta test number |
| 7 | Outbound counter + soft-cap reply | counter increments |
| 8 | build + tsc | both green |

---

## 7. Wording keys to add

```
app.sheets.tpl.expenseShort.en / .id
app.sheets.tpl.restoShort.en / .id
app.sheets.tpl.salesShort.en / .id
app.sheets.tpl.reimburseShort.en / .id
app.sheets.tpl.customShort.en / .id
app.wa.link.title / body / button / linked / unlink
app.wa.needLink / needSheet / needCredits / quota
app.wa.review / accept / edit / discard / saved
```

Also shorten existing `app.sheets.tpl.*.en/id` titles to the short form (Alya)
and keep bodies as field hints — one source, less duplication. Prefer editing
the main title keys to short form; add `*Short` only if landing still needs long
persona sentences (landing uses `landing.who.*` / `landing.persona.*`, not these).

**Decision:** edit `app.sheets.tpl.{resto,expense,sales,reimburse,custom}` to
short titles. Leave landing keys alone.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Meta Business / number not ready tonight | Code + flag; wire secrets when number exists |
| Vercel timeout on extract | Async after 200; `maxDuration` 60 on job route |
| Scope creep (tabs, asset tracker) | Park; wizard + WA only |
| Reimbursement double-entry (Bayu) | Keep template; do not market as hero |

---

## 9. Definition of done (audit)

- [ ] This plan committed in working tree
- [ ] Wizard shows 5 cards: icon + short title + peek; expense first
- [ ] Flag off: no WA behavior on prod paths
- [ ] Flag on + linked: photo Accept lands in Sheet and spends 1 credit
- [ ] Outbound ≥ soft cap → Indonesian quota message, no extract
- [ ] build + tsc pass
