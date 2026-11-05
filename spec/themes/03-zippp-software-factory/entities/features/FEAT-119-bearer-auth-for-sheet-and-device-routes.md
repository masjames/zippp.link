---
id: FEAT-119
type: feature
title: Bearer auth for sheet, device, notice and contribute routes
status: todo
assignee: adit
relations:
  blocks: []
  implements: ["DEC-003"]
  depends_on: ["DIR-001", "DEC-002", "DEC-003", "FEAT-113", "FEAT-118", "ROAD-001"]
verification:
  target_files:
    - "src/app/api/sheets/connect/route.ts"
    - "src/app/api/sheets/workspace/route.ts"
    - "src/app/api/sheets/map/route.ts"
    - "src/app/api/notices/route.ts"
    - "src/app/api/notices/read/route.ts"
    - "src/app/api/contribute/route.ts"
    - "src/app/api/auth/device/revoke/route.ts"
    - "src/app/api/auth/mobile/google-grant/route.ts"
    - "src/lib/google/sheets.ts"
  test_command: "npm test"
  prod_endpoint: ""
---

# What it is

Let a phone with a mobile bearer token set up and switch a Google Sheet, list and
revoke its devices, read and dismiss a notice, and donate an unreadable receipt.
Today those routes read the web cookie only.

# Goal

An Android user can finish sheet setup and basic account upkeep without the web app.

# Context

- Full design: `android-spec/09-bearer-route-slice.md`. It is the source for every
  contract, error code and test below.
- Blocks the Android sheet setup screen (`android-spec/06-sheet-choose-and-sign-in.md`
  Part B) and the devices block in `android-spec/04-settings.md`.
- `DEC-002`: no payment path on Android. This slice also closes two existing gaps:
  `POST /api/billing/subscribe` accepts a bearer token today, and
  `GET /api/billing/balance` returns credits and referral data to a bearer caller.
- Key finding: the Google helpers in `src/lib/google/sheets.ts` read the cookie, and
  a phone-only Google user has no Drive or Sheets tokens. A grant route is needed.

# Acceptance criteria

- [ ] `resolveRequestUser` on `sheets/connect`, `sheets/workspace` (GET), `sheets/map`,
      `notices`, `notices/read`, `contribute`, `auth/devices`, `auth/device/revoke`
- [ ] Google helpers take an explicit `userId`; no bearer path calls a cookie helper
- [ ] No `"google-user"` fallback in `sheets/connect`
- [ ] `POST /api/auth/mobile/google-grant` stores tokens only when the Google `sub`
      equals the bearer user id
- [ ] Stable `code` on every response; Android never shows `error` text
- [ ] `revoke_all` and `DELETE /api/sheets/workspace` stay web only for bearer
- [ ] `subscribe` rejects mobile; `balance` trims credits, `refCode`, `referralEarned`,
      `invite` for mobile
- [ ] Rate limiter on create, pick, map, revoke, contribute, grant
- [ ] `sheets/map` input caps
- [ ] Test table in the spec (section 7) implemented
- [ ] `data-boundary.test.ts` extended: new routes import no AI module; the
      `extract` route still uses `mobile-auth`
- [ ] Context file 7.5 and 7.6 updated from PLANNED to as built
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build` pass

# Verification

- Automated: the cases in the spec test table.
- Manual (Preview): phone-only Google user connects, creates and switches a sheet;
  revoke one other device and see the Telegram alert; a revoked phone gets signed out.

# Out of scope

- Column map editor on Android
- Disconnect sheet on Android (web only in v1)
- Origin check on the cookie path (listed as separate hardening in the spec)
- Any top-up, pricing or checkout on Android

# Decisions (owner, 2026-11-05)

| Decision | Owner call or default |
|---|---|
| Google grant on the phone is the `serverAuthCode` flow through `POST /api/auth/mobile/google-grant`. Option B (web Custom Tab) rejected | Owner call |
| The phone revokes **this device only** (Sign out). `GET /api/auth/devices` stays cookie only. Other devices are managed on the web | Owner call |
| Disconnect sheet stays web only (`DELETE /api/sheets/workspace` rejects bearer with 403 `WEB_ONLY`) | Default (recommended) |
| Column map editing stays web only | Default (recommended) |
| Rate limits in `09` section 3.1 accepted as proposed | Owner call |
| `drive.file` visibility accepted, with a clear in-app message and a Create button | Owner call |
| `/api/contribute` accepts bearer in this slice | Default |
| `me` returns `user.google_granted` | Default, owner may reverse |

The full table with file references is in `android-spec/09-bearer-route-slice.md`
section 10.

# Steps (build order)

1. Library: `userId` through the Google helpers, `hasTokensForUser`, `rateLimit`.
2. DEC-002 hardening: `subscribe` rejects mobile, `balance` trims for mobile.
3. Read routes: `notices`, `sheets/workspace` GET.
4. Write routes: `sheets/connect`, `sheets/map`, `auth/device/revoke` (own device only), `contribute`.
5. `auth/mobile/google-grant` and `me.user.google_granted`.
6. Context file section 7 updated. Preview run. Production only after STORY-102.

# Definition of done

A phone-only Google user with no sheet can sign in, grant access, create a sheet and
scan to it, with every gate green and no cookie helper reachable from a bearer path.
