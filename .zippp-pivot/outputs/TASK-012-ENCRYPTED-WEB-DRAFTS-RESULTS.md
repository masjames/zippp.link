# TASK-012 Results: Encrypted Web Drafts

**Date:** 2026-11-16  
**Status:** Complete  
**Scope:** Local web IndexedDB only. Synthetic account and receipt data only. No real Google, Drive, Sheets, billing, Preview, or Production access.

## Implementation

- IndexedDB schema version 3 adds an owner-key store.
- One non-extractable AES-GCM 256-bit `CryptoKey` per authenticated Google user ID. Key generation and persistence failures block draft initialization and writes; there is no plaintext fallback.
- New draft payloads encrypt image bytes and all receipt, thumbnail, review, debug, status, and error fields. Clear fields are limited to item ID, owner ID, creation timestamp, encryption version, and IVs. AES-GCM associated data binds owner ID, item ID, and timestamp.
- The image is immutable for a draft ID. Metadata-only edits reuse its existing ciphertext rather than encrypting the image repeatedly.
- Owner-bound plaintext records migrate only after the encrypted replacement transaction commits. Unowned legacy records remain hidden and unchanged until explicit import. Missing keys do not replace ciphertext or create a replacement key for encrypted records.

## Verification

- `npm test`: 114 passed, 0 failed. Includes AES-GCM roundtrip, tamper/wrong-key/identity rejection, encrypted write shape, blob-ciphertext reuse, committed migration, aborted migration preservation, and missing-key fail-closed behavior.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed in the isolated dependency workspace. An earlier clean copy used a `node_modules` symlink outside the project root and Turbopack rejected it; the final build ran in the isolated workspace with dependencies inside the project.
- Browser: local app at `127.0.0.1:39874`, with synthetic API responses and no external account access. Two A-owned legacy drafts migrated and rendered; B's legacy draft migrated only in B's session; a new synthetic B upload rendered and persisted encrypted. Reload retained B's draft; switching back to A showed only A's drafts. Closing and reopening the managed browser profile retained A's encrypted drafts.
- Browser IndexedDB inspection: database version 3; all 4 synthetic rows encrypted; no plaintext `blob`, `thumb`, `receipt`, `draft`, `status`, or `debug` fields; A and B each had a non-extractable AES-GCM key.

## Limits and remaining gates

- Same-origin JavaScript can retrieve the non-extractable key from IndexedDB and request decryption. This is at-rest protection against casual database inspection, not end-to-end encryption or protection against XSS or device compromise.
- If the key is lost, ciphertext may be unrecoverable. The app fails closed and does not delete or replace encrypted records as a fallback.
- Imported unowned legacy records remain plaintext until the user explicitly imports them; they are not read or assigned before that action.
- Native Android build and device verification remain deferred to the owner's Mac. Protected Sheets schema/write, OAuth/Drive, billing, and Production gates remain closed.
