# TASK-012 — Encrypt Web Drafts at Rest

**Status:** COMPLETE. 114 tests, TypeScript check, and isolated web build passed. Synthetic browser persistence/account checks passed. Native Android build/device verification remains deferred to the owner's Mac.

## Objective
Meet the target's encrypted web draft queue without losing existing captures. Keep account partitioning, foreground identity checks, explicit legacy import, and the existing review/send flow.

## Scope
- Encrypt new per-account draft payloads (image, thumbnail, receipt, edited fields, debug, and status) with Web Crypto AES-GCM; retain only the minimum clear ID/owner/index metadata.
- Store one non-extractable key per authenticated Google ID in a new IndexedDB key store. No plaintext fallback: if secure crypto/key storage is unavailable, block saving and warn.
- Migrate already owner-bound plaintext records without discarding the original until the encrypted write commits. Never decrypt, claim, or auto-assign unowned legacy records before the user explicitly imports them.
- Preserve authenticated owner checks on reads, writes, deletes, and writes to Sheets. No real Sheet or Drive access.

## Safety / limitation
A non-extractable key stored in same-origin IndexedDB protects persisted bytes from casual database inspection, but same-origin JavaScript can still request decryption. Do not call this end-to-end encryption or protection against XSS/device compromise. Key loss may make ciphertext unrecoverable; never delete a key or ciphertext as a fallback.

## Verification
Use synthetic drafts only. Test per-owner keys, encrypt/decrypt roundtrip, tamper rejection, ciphertext-only new records, interruption-safe legacy migration, and account isolation. Run full tests, typecheck, isolated build, and browser restart/account-switch verification. Update `STATE.md` and the canonical context with limitations.
