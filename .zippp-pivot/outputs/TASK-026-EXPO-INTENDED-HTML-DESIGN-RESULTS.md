# TASK-026 — Expo mock preview visual parity results

**Status:** Implemented and verified on 2026-11-17.

## Change

- Ported the supplied `ZIPPP-Pivot-Kit/reference/ZIPPP-Prototype-v0.8.html` visual system into the React Native `/rn/demo` route: grayscale palette, 18-screen selector, handset preview, three-tab navigation, Home glance metrics/actions, and Cash flow cycle/payment sections.
- Kept the implementation in Expo/React Native components. No WebView or prototype HTML/JavaScript was embedded.
- Kept demo state in `src/demo-api.ts` in memory. No real API calls, browser persistence, authentication bypass, or changes to authenticated `/rn` routes.
- Updated the bilingual demo notice to state that no sign-in or server session exists and all accounts/data/actions are simulated in memory. Real Google authentication on `/rn` is unchanged.

## Verification

- `npm test --prefix apps/expo-compat`: 14 passed.
- `npm run typecheck --prefix apps/expo-compat`: passed.
- `npm run expo:web:copy`: passed; generated `/rn` web export copied to ignored `public/rn`.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed. Existing Next middleware deprecation warning only.
- Headless browser opened `/rn/demo` at 1440×1000 without authentication. All 18 screen routes opened and the expected screen headings/actions were present. No browser errors on the final build.
- Exercised mock expense entry, simulated receipt capture/review/approval, bill creation and payment. Home and Cash flow totals updated in memory as expected.
- Audited requests after navigation and interactions: no `/api/*` requests.
- Rechecked the updated English and Indonesian no-login notices in the browser; navigation still made no `/api/*` requests.

## Limits

- The v0.8 artifact is an illustrative browser prototype. Only its visual direction was used; its records, browser storage, and JavaScript behaviors were not copied.
- The browser relay extension is disconnected, so the Mac browser was not observed. Tailnet reports the Mac peer active/direct.
- Google OAuth callback registration, authenticated Mac E2E, and native Android/iOS, SQLCipher/key-store, and camera checks remain deferred.
