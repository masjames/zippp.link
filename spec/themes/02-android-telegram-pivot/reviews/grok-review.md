# Technical Review: Zippp Android Companion & Telegram Pivot

**Reviewer role:** Senior architect & security auditor  
**Date:** 2026-10-21  
**Scope:** Active codebase contracts + `SPEC-ANDROID-COMPANION.md` + `plans/android-rollout-plan.md`  
**Status:** GO WITH AMENDMENTS — do not start Phase 1 until amendments land in specs

---

## 1. Executive Verdict

**GO WITH AMENDMENTS**

Direction is right: web owns OAuth/billing/Sheets setup; Android is a consumption-only capture companion; Telegram replaces WhatsApp unit economics. That matches existing laws (Sheet as SoR, check-before-accept, credit ledger in Upstash) and reuses patterns already proven in the WA channel (`loadTokensForUser` / `loadWorkspaceForUser`).

Do **not** start Phase 1 coding until the amendments below are written into the specs. Several gaps are ship-blockers for Play compliance, pairing security, and mobile append auth.

---

## 2. Compliance & Security Audit

### High

| Risk | Finding |
|---|---|
| **Pairing entropy / format** | Spec says “6-char” and “6 digit”, examples are `ZIP-842`. If real codes are `ZIP-` + 3 digits → ~10 bits. Public `POST` exchange + 10m TTL without rate limits is brute-forceable. |
| **No rate limit on pairing login** | `/api/auth/login` (as specified) is public. Missing IP + global attempt budgets and lockout. |
| **No device revoke / JWT denylist** | 30-day JWT, EncryptedDataStore only. Lost phone = full scan+append until expiry. No web “Unpair devices”, no `jti` registry. |
| **402 / error copy anti-steering** | Append today returns `"No credits. Top up to send."` + `needsCredits`. If Android shows that string → Play anti-steering. Spec only constrains static UI, not API error mapping. |
| **Append auth under-specified** | Append still uses cookie `hasTokens()` / `loadWorkspace()`. Bearer JWT must resolve **user-scoped** tokens/workspace (WA already does). Phase 1.5 says “accept Bearer” but not the ForUser rewrite. |
| **Route collision** | Existing `GET /api/auth/login` starts Google OAuth. Spec’s `POST /api/auth/login` for pairing will collide. |
| **Play + GitHub OTA conflict** | Sideload OTA via GitHub is fine for Phase 1 APK. Once on Play, in-app “download APK from GitHub” violates distribution policy. Dual-channel update policy missing. |

### Medium

| Risk | Finding |
|---|---|
| **Hard-flag gate missing on mobile** | `verify-receipt` law: hard flags “must be tapped first”. Web `ConfirmCard` also doesn’t enforce this (only empty lines/price). Android shows warning pills but no Terima block. Check-before-accept is weaker than the verifier contract. |
| **`Ubah` vs grounding** | Manual edits are human override (correct), but flags/nulled paths after edit are undefined. Risk: Terima with ungrounded values still flagged, or flags left stale. |
| **OTA integrity** | `GET /api/app-version` has no `sha256`. Signing-cert continuity helps; still should checksum + refuse mismatched APK. Phase 3 only describes non-blocking dialog; `mandatory` dismiss rules incomplete. |
| **Telegram link binding** | `/start link_<token>` mirrors WA pending tokens (good), but entropy/TTL/single-use and coexistence with admin `TELEGRAM_CHAT_ID` alerts are not spelled out. `support_<userId>` leaks Google user id. |
| **Data-boundary on extract auth** | Extract must stay Google-token-free (`data-boundary.test.ts`). Bearer verify must use **only** `MOBILE_JWT_SECRET` — never `currentUser()` / token-store on the photo path. |
| **Ops / template gap** | Review FSM omits staff/outlet/payment/purpose. Breaks resto-inventory / sales-recap / reimbursement vs `USER-FLOW.md`. |
| **Extract currently public** | No auth today. Adding JWT is good; without it mobile + abuse share one open OCR burn. |

### Low

| Risk | Finding |
|---|---|
| **Service Charge UI** | Review UI lists “Service Charge”; `Receipt` type has no such field. |
| **Deep link manifest** | QR uses `zippp://pair?...`; Manifest tasks omit intent-filter. |
| **Emoji in credit pill** | Spec uses `⚡`; AGENTS/wording culture is anti-hype — prefer wording keys. |
| **Toolchain on this Mac** | SDK 34+ present; **no JDK installed**; `android/` missing. Phase 2 blocked until JDK 17/21. Stack choices (Compose, CameraX, Encrypted DataStore, OkHttp) are fine once JDK is in place. |

---

## 3. Architecture & Contract Edge Cases

### What already fits

- Laws in §2 of companion spec align with `SPEC.md` / `ARCHITECTURE.md`.
- Credit spend on Terima + refund on append failure matches ledger Lua + append route.
- WA already proved non-cookie Sheets access via `*ForUser` — mobile should clone that, not invent a third path.
- Admin Telegram (`src/lib/telegram.ts` → single `TELEGRAM_CHAT_ID`) can coexist with per-user chat maps if namespaced cleanly.

### Gaps / FSM holes

```
Pair → Camera → Extract → Review → Append
```

| Gap | Impact |
|---|---|
| No server error code contract (`INSUFFICIENT_CREDITS`, `INVALID_PAIRING_CODE`, `SHEETS_REAUTH`) | Android will string-match English errors → compliance + i18n bugs |
| No “sheet not connected / template ops required” mobile states | Pairing can succeed with incomplete workspace; Terima fails late |
| No multi-device / session list | Can’t answer “who is paired?” or revoke |
| Phase order: backend (1) before web Hubungkan UI (5) | OK, but Android can’t E2E until 5; gate should say so |
| Phase 7 kills WA before Android is proven | Capture regression for any WA beta users — sequence should be Android stable → flag off WA |
| Login response embeds `spreadsheet_id` | Display OK; append must **ignore client sheet id** and use server workspace |
| Low-credit alert in `ledger.ts` on every spend | Hot path; must be async/fire-and-forget and threshold-edge only (cross 10→9 once) |

### Auth model (critical)

```
Web cookie zippp_sid → sessionUserId → tokens/workspace
Mobile JWT sub=google_user_id → loadTokensForUser / loadWorkspaceForUser
Extract: verify JWT signature only (identity for rate/abuse), never load Google tokens
Append: verify JWT → spend(userId) → Sheets as that userId
```

If extract imports anything under `@/lib/google/`, `data-boundary.test.ts` fails and Limited Use claim breaks.

---

## 4. Checklist Answers (short)

| Criterion | Answer |
|---|---|
| **1. Inkdrop / 0% fee** | Constraints are mostly sufficient for a consumption-only companion. Residual risk = surfacing top-up CTAs via API errors, and GitHub OTA after Play listing. Zero-credit: neutral status + Refresh + Telegram support only — keep; never open browser to `/app/topup`. |
| **2. Pairing security** | Not safe as written (format ambiguity + no rate limit + no revoke). JWT + data-boundary OK **if** extract auth is JWT-only and append uses ForUser. Lost phone: **not addressed**. |
| **3. Check before accept** | Terima/Buang match product law; hard-flag acknowledge + `Ubah` flag-clear rules missing (web has same debt). |
| **4. OTA** | Feasible; add SHA-256 + signing continuity; clarify mandatory vs optional; split sideload vs Play update channels. |
| **5. Telegram vs billing** | Additive to admin alerts; not a breaking change if `sendTelegram` (admin) kept. User link must copy WA pending-token pattern. Wire top-up confirms in Kasera/Paddle webhooks (already call admin Telegram). |
| **6. Monorepo / macOS** | Deps OK with SDK 34; **install JDK 21** before Phase 2. |

---

## 5. Concrete Recommended Amendments

### A. `SPEC-ANDROID-COMPANION.md`

**§3 Play compliance — add:**

1. Mobile must map server errors to `wording.txt` keys only. Never render `error` strings that mention top-up / buy / website / pricing.
2. API returns machine codes, e.g. `code: "INSUFFICIENT_CREDITS"`; Android shows: *“Saldo scan habis. Periksa akun Anda atau hubungi admin.”*
3. Distribution modes: `sideload` (GitHub OTA allowed) vs `play` (update via Play Store intent only; hide APK download).

**§4 Pairing — replace code contract:**

1. Code = **8 chars** from alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (same as ref codes), **no `ZIP-` prefix** in the secret (display can group `AB12-CD34`).
2. Redis: `pair:{code}` → `{ googleUserId, email, exp }`, TTL **5–10 min**, **single-use DEL**.
3. Rate limits: per IP ≤ 10/15min; per code ≤ 5; global anomaly tripwire.
4. Rename endpoint to **`POST /api/auth/pair/consume`** (keep `GET /api/auth/login` for OAuth).
5. JWT claims: `{ sub, email, scope: "mobile_scan", jti, iat, exp }` — store `jti` in Redis for revoke.
6. Web Settings: **Paired devices** list + **Revoke all** (delete `jti`s / bump `token_version` on user).
7. Logout on device = clear DataStore **and** call `POST /api/auth/pair/revoke` with Bearer.

**§4 / §6 Append auth — add:**

1. Bearer path uses `loadTokensForUser(sub)` + `loadWorkspaceForUser(sub)` + `getAuthenticatedClient(sub)` (same as WA).
2. Client-supplied `spreadsheet_id` is ignored.
3. Extract Bearer: signature verify only; extend `data-boundary.test.ts` to forbid google imports in `mobile-jwt.ts` consumers on the photo path.

**§5 OTA — add:**

```json
{
  "version_code": 2,
  "version_name": "1.0.1",
  "download_url": "...",
  "sha256": "...",
  "min_supported_version_code": 1,
  "mandatory": false,
  "channel": "sideload"
}
```

Mandatory = no dismiss, block camera until updated. Client verifies SHA-256 before install intent.

**§6 Review — add:**

1. Hard flags block Terima until each path is acknowledged or edited (`Ubah`).
2. On edit of path P: drop flags for P; do not re-run OCR grounding (human override).
3. Template ops: staff / outlet / payment / purpose per `USER-FLOW.md`; fetch lists from `GET /api/auth/pair/session` or workspace bootstrap.
4. Remove “Service Charge” unless schema adds it.

**§7 Telegram — add:**

1. Keep `src/lib/telegram.ts` as **admin** (`TELEGRAM_CHAT_ID`).
2. User alerts in `src/lib/telegram/user-alerts.ts` keyed by `tg:link:{chatId}` / `tg:user:{googleUserId}`.
3. Link tokens: 32-byte hex, TTL 15m, single-use (clone `wa/store` pending).
4. Support deep link: `support_<opaqueToken>` not raw `userId`.
5. Low-credit: trigger once when balance crosses below 10, async, never inside Lua spend.

### B. `spec/themes/02-android-telegram-pivot/android-rollout-plan.md`

1. **Task 1.3:** rename login → `pair/consume`; add rate-limit + revoke endpoints.
2. **Task 1.5:** explicitly “refactor append to dual auth: cookie session **or** mobile JWT → `*ForUser`”; add integration test that cookie and Bearer both append to same sheet.
3. **Task 1.5b:** mobile-safe error codes; wording keys for Android zero-credit / sheets reauth.
4. **Task 1.7:** device session store (`jti`, device label, createdAt).
5. **Phase 2:** prerequisite “JDK 17+ installed; `JAVA_HOME` set”; document SDK 34.
6. **Phase 3:** mandatory OTA + SHA-256; Play vs sideload channel flag.
7. **Phase 4:** hard-flag gate + template ops; parity test vs web Accept.
8. **Phase 6 before Phase 7:** Telegram user alerts live; WA flag off only after Android E2E gate green.
9. **Phase 7:** do not delete WA until Android capture metrics OK; archive, don’t big-bang.

### C. Pre-code gate (amendments done when…)

- [ ] Pairing entropy + rate limits + revoke documented
- [ ] Endpoint rename (no OAuth collision)
- [ ] Append ForUser + extract JWT-only boundary written
- [ ] Mobile error-code / anti-steering matrix in wording
- [ ] OTA checksum + distribution channel
- [ ] Hard-flag + ops fields in Review FSM
- [ ] Telegram admin vs user split + link token security
- [ ] JDK install noted as Phase 2 prerequisite

---

## Tradeoff

Tightening pairing (8-char + rate limits + device revoke) and dual-channel OTA adds a few days of backend work; shipping the current draft risks Play rejection or account takeover via weak codes — not worth the speed.

**Recommendation:** amend specs → then Phase 1.

---

## Sources read for this review

- `AGENTS.md`
- `spec/themes/01-mvp/SPEC.md`, `spec/themes/01-mvp/ARCHITECTURE.md`, `spec/themes/01-mvp/USER-FLOW.md`
- `spec/themes/02-android-telegram-pivot/SPEC-ANDROID-COMPANION.md`, `spec/themes/02-android-telegram-pivot/android-rollout-plan.md`
- `src/lib/data-boundary.test.ts`, `src/lib/verify-receipt.ts`, `src/lib/billing/ledger.ts`
- `src/app/api/extract/route.ts`, `src/app/api/sheets/append/route.ts`, `src/lib/auth.ts`
- `src/lib/telegram.ts`, `src/lib/wa/*`, Google token/workspace ForUser APIs
