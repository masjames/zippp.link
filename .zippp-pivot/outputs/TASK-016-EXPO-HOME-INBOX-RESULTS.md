# TASK-016 — Expo Home and Inbox results

**Status:** Expo web slice verified. Full client and native platform verification remain in progress.

## Delivered

- Replaced the Expo compatibility labels with React Native Home and Inbox routes and working navigation.
- Added a shared local-preview shell. It identifies the preview as disconnected, shows no fabricated Sheet totals or receipts, and clearly says capture is disabled.
- Added a copy generator that derives app strings from `spec/wording.txt`; no new UI copy is hardcoded in the screens.
- Set language after hydration. The first Indonesian browser pass exposed React hydration error #418 because server and browser locales differed. Initial render now stays English, then switches to the browser locale after mount.
- Kept Next.js/Kotlin feature behavior and external-data gates. Added type-only `FormData.get` assertions in existing handlers to restore root typechecks; request handling is unchanged.

## Verification

| Check | Result |
|---|---|
| Expo `npm run typecheck` under Node 22 | Passed |
| Expo `npx expo install --check` | Passed |
| Expo `npm run export:web` | Passed; `/`, `/inbox`, `/_sitemap`, and `/+not-found` exported |
| Browser, 390×844 | Passed; Home and Inbox navigation, Indonesian copy, no horizontal overflow, no console/page errors |
| Root `npx tsc --noEmit` | Passed |
| Root `npm run build` | Passed; compiled, typechecked, and generated 105 routes |
| Android/iOS build | Not run; requires owner's Mac |

No Google, Sheet, Drive, billing, or production calls were made. This preview has no capture, authentication, or connected account yet; it is not the completed product client.
