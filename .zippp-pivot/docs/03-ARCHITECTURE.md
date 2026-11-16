# 03 — Target Architecture and Migration Boundaries

**Owner-approved target:** single React Native/Expo application for Android, iOS, and web. Keep the existing Next.js server as backend. Build the new client in parallel; this does not authorize production rollout or retiring current clients.

## One-system drawing

```text
Android / iOS / Web (Expo Router + React Native)
  UI: Home | Capture | Cash flow
  local SQLite: approved/unapproved drafts, outbox, last-known snapshot
  secure store: session tokens only
        |
        | TLS + authenticated API + operation id
        v
Next.js API on Vercel (kept from current repo, hardened)
  auth/session, entitlement, OAuth-grant management
  receipt extraction adapter + deterministic verifier (no Google credentials)
  mutation coordinator: approve, persist, retry, reconcile, idempotency
  Google Sheets ledger adapter, Google Drive receipt adapter
  aggregate projection builder, sync status API
        |                               |
        v                               v
USER GOOGLE SHEET (committed ledger)   USER DRIVE (image evidence)
        |
        +-- confirmed revision -> read model -> Upstash Redis (short-lived projection)

Separately: Upstash durable app metadata for auth/entitlement/idempotency/outbox coordination,
never as an independent confirmed ledger of financial facts.
```

## Responsibilities and trust boundaries

| Component | Must do | Must not do |
|---|---|---|
| React Native client | Camera, OCR progress, editable draft, optimistic local view, status, forms, navigation | Hold Google refresh tokens, believe OCR is correct, claim cloud sync before confirmation |
| OCR service | Receive minimal receipt image, parse and flag values | Receive users' Sheet contents or Google OAuth tokens |
| Ledger coordinator | Validate and idempotently write a user-approved event, return a committed result | Bill twice, invent a merchant/date/amount, reinterpret an internal transfer as spending |
| Google Sheets | Canonical event rows and account config, user-editable | Be treated as atomic multi-row transaction engine without safeguards |
| Google Drive | Optional approved capture proof and protected receipts awaiting review (owner-approved) | Become an unannounced ZIPPP-hosted image archive |
| SQLite local | Reliable offline drafts, outbox, read cache and reconciliation markers | Be presented as permanently cloud-synced before Google acknowledgement |
| Redis | Fast projection of confirmed Sheet snapshot, sync metadata, queues/idempotency | Become authoritative financial ledger or store plaintext receipt contents unnecessarily |

## Why preserve Next.js server

The attached repository already contains Google token management, extraction routes, scan ownership and spreadsheet append; rewriting these while also changing platforms would combine too many failure risks. The browser-facing Next.js pages can be retired when the Expo web client is ready, but the server endpoints can remain deployed as an API (a monorepo with `apps/app` and `apps/api`, or current `src/app/api` bridged). Select after audit; no premature package-moving.

## UI stack

- `Expo` + `React Native` + `TypeScript` + `Expo Router`.
- `Tamagui` as a **candidate** shared UI toolkit with small ZIPPP custom primitives and stable tokens; validate native/web performance and RN/Expo version compatibility before committing. Do not let library theming override accessibility or target sketches.
- `FlashList` for long activity/history; basic ScrollView/FlatList for shorter screens where simpler.
- `expo-sqlite` for durable local state/outbox; `expo-secure-store` for limited session secrets; platform-dependent storage and encryption review required.
- `react-native-vision-camera` or native scanning module only if Expo's available camera APIs cannot meet the continuous viewfinder requirement; requires custom dev client and separate native maintenance. Build a manual shutter first; auto-detection must be optional and verified on devices.
- API schema validation e.g. `zod` for runtime payload contracts, use shared TypeScript domain package if it reduces duplication.
- Use web-specific Google sign-in route, native Google auth with server code flow, and shared API sessions; never embed client secret.

## API organization to target (proposed, versioned as needed)

```text
GET  /api/v2/home                -> dashboard snapshot + freshness + pending count
GET  /api/v2/activity            -> paginated canonical confirmed transactions
GET  /api/v2/accounts            -> accounts and roles
POST /api/v2/transactions        -> manual income/expense/transfer (idempotent)
PATCH /api/v2/transactions/:id    -> correction event, not silent history rewrite
POST /api/v2/receipts            -> capture ticket + upload token/path (photo, not approved)
POST /api/v2/receipts/:id/extract -> enqueue/retry OCR, no ledger write
GET  /api/v2/receipts            -> draft inbox; device local merge
POST /api/v2/receipts/:id/approve -> exactly one confirmed expense event
POST /api/v2/sync                -> explicit refresh job/status
GET  /api/v2/sync                -> status + confirmed revision/time
GET  /api/v2/cashflow            -> period-aligned inflows/outflows/planned bills
```

**Not permission to replace legacy endpoints immediately.** Adapter can call existing `/api/extract`, `/api/sheets/append`, `/api/auth/mobile/*` behind server-only wrappers until v2 migration is proven. Do not expose `v2` routes as existing in any user-facing claim.

## Data migration order

1. Inventory and protect as-built source; retain working production routes.
2. Define normalized ledger event model, explicitly map old personal-expense template headers and receipt-line structure.
3. Build read-only ledger adapter (old sheet → normalized projection) with golden fixtures; prove daily/weekly totals and balance rules.
4. Ship a new Expo shell with Home, Activity, Accounts reading the adapter; no mutation until stable.
5. Add local draft inbox, camera capture and extraction/review.
6. Add idempotent write coordinator; shadow compare old vs new APIs using synthetic fixtures.
7. Turn on explicit account transfers, bills and savings. Keep old workbook compatible or offer opt-in versioned workbook conversion with backup.
8. Launch phased to test accounts, verify native camera/OAuth, production auth, Google quotas, offline recovery; only then retire legacy UI.

## Performance and reliability targets (proposed, test not claim)

- Warm Home last-known snapshot visible without a network round-trip; background refresh on resume with visible freshness marker where relevant.
- UI response to shutter: prompt tactile/visual captured acknowledgement; don't await OCR or upload before allowing the next receipt.
- 100% idempotent financial writes under repeated submit and unstable network in integration tests.
- No blank Home while offline if a previously confirmed snapshot exists; missing snapshot shows explanatory empty state, never synthetic zeros.
- Touch controls ≥44pt on iOS / ≥48dp on Android; dynamic type and VoiceOver/TalkBack labels.

## Stop conditions

If as-built code cannot support scoped Google access, reliable idempotent append, or accurate ledger mapping, suspend feature building and write a focused decision record. Do not create an alternate ZIPPP-hosted financial database without explicit owner approval.
