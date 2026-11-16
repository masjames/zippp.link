# TASK-014 Results: Usable Local Dummy Preview

**Date:** 2026-11-16  
**Status:** Complete  
**Scope:** Local development UI only, using the synthetic `local-preview-user`.

## Changes

- Dummy-mode root now opens Home. Home and Inbox navigation remain available without a workspace.
- Home explains that no connected personal-expense Sheet exists, instead of spinning forever or showing fabricated totals.
- Inbox explains that no local drafts exist. Capture is visibly disabled in the UI-only preview.
- Protected application APIs remain blocked; no Google, Sheets, Drive, billing, extraction, or Production operations are enabled.

## Verification

- `npm test`: 117 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed in a sanitized isolated workspace.
- Browser at `https://susi.tail6078b4.ts.net:39876/`: root redirected to Home. The page showed Home's empty-sheet state and an Inbox navigation button. Inbox showed its empty local-draft state and disabled-capture notice.
- Browser secure context and `crypto.subtle` were available; IndexedDB held a non-extractable AES-GCM key for `local-preview-user`.
- Append, extraction, and billing API requests returned 403.

## Limits

- Tailscale preview uses a temporary self-signed certificate. The managed browser accepted it; the Mac browser may require the user to bypass its certificate warning. Direct Mac browser access remains unobserved because the relay is unavailable.
- Dummy mode is development-only and not server authentication. Capture, extraction, Sheets writes, billing, and other server actions remain disabled. FEAT-102/115 device checks and the other owner-Mac gates remain open.
