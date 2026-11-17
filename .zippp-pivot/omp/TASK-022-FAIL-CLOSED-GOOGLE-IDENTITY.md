# TASK-022 — Fail-closed Google identity

**Status:** Implemented and verified. No OAuth scopes or credentials changed.

## Scope

- Resolve web Google identity only from the verified token `sub`; token-info failure or missing subject must fail sign-in instead of using a shared placeholder ID.
- Refuse Sheet connection when the saved Google user ID cannot be resolved, even if token presence is reported.
- Preserve mobile Google ID-token verification, which already requires a nonempty subject.
- Never create, connect, or write a workspace under a generic `google-user` identity.

## Verification

- `src/lib/google/oauth.test.ts`: 3 deterministic tests for valid subject, missing subject, and token-info failure.
- Full root `npm test`: 120 passed.
- Root `npx tsc --noEmit` and `npm run build`: passed.
- No real OAuth login, Google Sheet, Drive, billing, or production service was used.

## Remaining auth gate

The local Tailnet OAuth redirect URI still returns `redirect_uri_mismatch`; add the URI to the Google OAuth web client before remote sign-in can complete. No fallback or bypass was added.
