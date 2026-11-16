# TASK-014: Usable Local Dummy Preview

**Status:** COMPLETE. Dummy preview now opens on Home and provides Home/Inbox navigation without enabling server actions.

## Objective
Make the development-only dummy session useful for screen review. Do not invent receipt, balance, or workbook data, and do not enable protected APIs.

## Scope
- Route the dummy preview entry to the new Home screen; make Home and Inbox reachable from the shell.
- Show an explicit empty Home state when no real personal-expense Sheet is connected.
- Show an explicit empty Inbox state for a dummy user with no local drafts.
- Disable capture actions in this UI-only preview; keep all APIs other than auth bootstrap blocked.
- Preserve the visible dummy-user warning.

## Verification
Use the credential-free Tailscale dev preview. Verify Home, Inbox, route navigation, secure-context IndexedDB initialization, and that API actions remain blocked. Run `npm test`, `npx tsc --noEmit`, and `npm run build`.

## Limits
The preview contains no fake Sheet or receipt data and does not perform extraction, append, billing, or OAuth. Native Android verification remains on the owner's Mac.
