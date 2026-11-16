# TASK-019 — Expo capture and encrypted local drafts

**Status:** Web capture and encrypted Inbox verified. Native compilation, SQLCipher/key-store, and camera verification remain pending on the owner's Mac.

## Delivered

- Expo Capture uses `expo-camera` on native platforms and a photo picker fallback. The web path accepts a local image file. Configured MIME and size limits are enforced before saving.
- Web drafts use the existing owner-scoped AES-GCM IndexedDB store under the `expo:<owner>` namespace. The local dummy preview uses `local-preview-user` and does not grant server authorization.
- Native draft storage uses an owner-hashed SQLite database, checks `PRAGMA cipher_version` before use, and keeps the random database key in SecureStore. It fails closed if SQLCipher is unavailable or the stored key cannot open the database.
- Inbox lists saved local drafts and opens the image. Capture success and failure feedback is visible.
- Capture does not invoke OCR, Drive, Sheets, billing, or any server mutation. Home totals remain untouched.

## Verification

| Check | Result |
|---|---|
| Existing encrypted storage tests | 17 passed across `src/lib/batch-db.test.ts` and `src/lib/draft-crypto.test.ts`; covers ciphertext round-trip, owner separation, tampering, transaction behavior, and missing-key failure |
| Expo data tests | 4 passed |
| Expo TypeScript check | Passed |
| Expo prebuild config | Passed; SQLCipher plugin option and camera/photo permission copy resolve. This does not compile native code. |
| Expo static web export and `/rn` copy | Passed |
| Root `npx tsc --noEmit` | Passed |
| Root `npm run build` | Passed |
| Tailnet browser, 390×844 | Synthetic 96×96 PNG selected; visible saved confirmation; Inbox item survived page reload; image preview decoded at 96×96; no browser errors |
| Network during dummy capture/Inbox | Only `GET /api/auth/session`; no OCR, upload, Sheets, Drive, or mutation request |
| Test data cleanup | Removed the synthetic dummy-owner draft from the isolated browser profile |
| Native SQLCipher, SecureStore, camera, Android/iOS build/device checks | Not run; requires the owner's Mac and device |

No real Google account, Sheet, Drive, billing, Preview, or Production service was accessed. The development preview uses a temporary self-signed certificate. Direct Mac browser trust/access has not been verified.
