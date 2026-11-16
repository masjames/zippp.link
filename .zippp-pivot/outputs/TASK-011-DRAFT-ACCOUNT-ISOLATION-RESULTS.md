# TASK-011 — Account-Safe Web Drafts

**Result:** Verified locally with synthetic identities and receipts. Draft access is partitioned by authenticated Google ID at the application layer. IndexedDB data is still unencrypted and accessible to same-origin code.

## Implemented

- IndexedDB v2 adds an `ownerId` index without deleting existing records. New receipts are tagged with the server-authenticated Google user ID. Reads, writes, deletes, and UI metadata are owner-scoped; overwriting or deleting another owner's item is refused.
- Existing unowned receipts remain hidden and intact. Inbox shows their count and warning; a user can explicitly claim them. Claiming is atomic and never changes an already-owned record.
- Capture stays disabled until the authenticated owner and store are ready. Returning tabs revalidate identity through a read-only session endpoint; the app hides account-specific views during the check, reloads on mismatch, and fails closed if verification fails.
- Web append requests include the expected owner and the server rejects a mismatch before spending credits or writing. Correction telemetry, opt-in photo contribution, and receipt-summary reads are also owner-bound. Mobile bearer behavior is unchanged.

## Verification

| Check | Result |
|---|---|
| `npm test` | 108 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit --incremental false` | Passed. |
| Clean `npm run build` | Passed in the isolated workspace. |
| Browser legacy import and account isolation | Two synthetic unowned receipts were hidden before import, then claimed by account A. Account B saw neither. A new B receipt was visible to B only. |
| Foreground identity switch | With intercepted session responses A→B and B→A, the account-specific content was `visibility:hidden` during both checks; after reload only the matched account's receipts appeared. |
| Stale append simulation | A synthetic B draft sent `expectedUserId=B` while the intercepted server session was A. The simulated route rejected it with `OWNER_MISMATCH`; the client reloaded to A without exposing B's receipt. Matcher unit tests passed. |

All browser requests used synthetic identities and intercepted responses. No live Google Sheet, Drive, payment, deployment, or customer data was accessed. The browser evidence does not prove the live Google OAuth/session flow. IndexedDB remains unencrypted; same-origin scripts and device compromise are outside this isolation boundary. Android native build/device verification remains deferred to the owner's Mac.
