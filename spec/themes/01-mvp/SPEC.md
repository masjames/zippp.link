# zippp spec

Status: **ACTIVE — Zippp Space pivot (2026-11-01).**  
**Source of truth for direction:** Factory `DIR-001`, `DEC-001`…`005`, `ROAD-001`.  
Older Revision 2 audit tasks remain useful for sheet layout engineering but **do not** redefine ICP or monetization.

Depends on: `USER-FLOW.md`, `ARCHITECTURE.md`, `TEMPLATES.md`, `PRICING.md`, `wording.txt`  
Domain: zippp.link

---

## One sentence

**Zippp Space** — personal finance OS: capture spend, track assets and goals, share a Space; web and Android are the same product; pay on the web.

---

## Who it is for

| Who | Job |
|---|---|
| Individual | Track personal spend, assets, goals |
| Space members | Partner / housemate / anyone invited — never labeled “family” by default |

**Parked as ICP:** Sonny (purchasing), Fais (sales), Bagas (reimbursement). Templates may remain in code for existing workspaces; do not market or expand them.

---

## Product musts (direction)

1. **Zippp Space** as the shared workspace noun (DEC-001).
2. **Web + Android parity** for the personal finance product; **payment web-only** (DEC-002, DEC-003).
3. **Auth:** Google and/or magic link; optional pairing for device bind (DEC-003).
4. **Capture:** camera + manual + opt-in notification listener → record prompt (DEC-004).
5. **Check before accept** — nothing trusted to the ledger/sheet without confirmation.
6. **Never invent** OCR/model values; unknown stays empty.
7. **Fair-use usage %** on subscription; no new credit-pack UX (DEC-002).
8. **Assets + goals** in scope (ROAD phases after capture loop).
9. Every user-visible string in `spec/wording.txt`.
10. Server decides money and entitlements — never trust the client.

## Product musts (still true from mill era)

1. Google OAuth for Sheets/Drive when connected. Scopes: `spreadsheets` + `drive.file`.
2. Data boundary: photo path never touches Google tokens; sheet path never calls AI.
3. No receipt image store on zippp servers; optional proof → user’s Drive.
4. Region-aware `/id` vs `/` for locale/copy.

## Must not

- Android IAP / pricing / checkout.
- Accessibility-service bank scrape.
- Primary ICP expansion back to resto / sales / reimbursement.
- Auto-book transactions without user confirm.
- Invent units or values absent from the receipt.
- Em dashes or hype words in user-facing copy.
- Secrets in git, logs, or `NEXT_PUBLIC_*`.

---

## Monetization

See `PRICING.md` and `DEC-002`. Direction = monthly subscription + fair-use %.  
Legacy: code may still spend “credits” until ROAD Phase 6 migrates the ledger.

---

## Templates

Living personal template: `personal-expense` (and future Space-native schemas).  
`resto-inventory`, `sales-recap`, `reimbursement`, `custom` — **legacy / parked** for new users (DEC-005). Details: `TEMPLATES.md`.

---

## UX contract

See `USER-FLOW.md` (Space-first). Routes evolve under ROAD-001; Snap/Settings/Sheet/Admin remain until Space chrome replaces them.

---

## Android

Not a reduced companion. Full client under DEC-003 / DEC-004. Historical notes in `spec/themes/02-android-telegram-pivot/` — banner those files; do not treat companion as north star.

---

## Privacy and ops

Unchanged spine: fail closed on mobile JWT secret; `MOBILE_API_ENABLED` dark until new device proof under DIR-001.
