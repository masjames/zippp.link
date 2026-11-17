# TASK-022 — Fail-closed Google identity results

**Status:** Implemented and verified.

## Changes

- `resolveGoogleUser()` now returns only a verified nonempty Google `sub`. Token-info errors or missing subjects raise an identity-verification error; no generic `google-user` fallback remains.
- `/api/sheets/connect` returns HTTP 401 if the saved Google user ID is missing rather than persisting a workspace under a placeholder.
- The mobile Google-token endpoint already rejects tokens with no `sub`; no change there.
- Canonical context updated to state that OAuth identity must be the verified subject.

## Verification

| Check | Result |
|---|---|
| OAuth identity unit tests | 3 passed |
| Full root test suite | 120 passed |
| Root TypeScript check | Passed |
| Root production build | Passed |
| Real Google account or Sheet | Not used |

The remote Expo sign-in still needs the Tailnet callback URI registered in the Google OAuth web client. No dummy user or authentication bypass was used.
