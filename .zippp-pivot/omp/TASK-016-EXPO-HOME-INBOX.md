# P2.3 — Expo Home and Inbox preview

**Status:** In progress. The Expo SDK web spike passed; this task ports the existing truthful dummy Home/Inbox experience into the new React Native client.

## Scope

- Use Expo Router routes for Home and Inbox with shared React Native layout and navigation.
- Source every user-visible string from `spec/wording.txt`; generate the app copy at build time.
- Show the explicitly local-only preview state. Home has no Sheet totals; Inbox has no local drafts. Do not invent receipts or balances.
- Do not call APIs, sign in, enable capture, or write to Sheets, Drive, billing, or server state.
- Keep Next.js, Kotlin, and existing server routes unchanged.

## Acceptance

- `npm run typecheck` and `npx expo install --check` pass under Node 22.
- `npm run export:web` produces Home and Inbox routes.
- Browser confirms Home/Inbox navigation and truthful empty states, with no console errors.
- Update `.zippp-pivot/outputs/TASK-016-EXPO-HOME-INBOX-RESULTS.md` and `STATE.md`.
