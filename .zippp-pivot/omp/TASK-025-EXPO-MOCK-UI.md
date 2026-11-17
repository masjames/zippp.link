# TASK-025 — Isolated React Native UI with mock APIs

**Status:** Implemented and verified. The isolated preview uses only in-memory mock state; real `/rn` routes and backend APIs are unchanged.

## Goal

Provide an Expo Web design preview that opens without OAuth so the owner can inspect the full React Native experience first.

## Scope

- Add an isolated `/rn/demo` route implemented with React Native components, not an HTML WebView.
- Use `ZIPPP-Pivot-Kit/reference/ZIPPP-Prototype-v0.8.html` for screen inventory and layout cues only; the owner may later supply a newer intended HTML reference.
- Cover all 18 prototype screens and route interactions through a local mock API/service only. Clearly label every screen/data as demo; do not use a real account identity or invoke Next.js auth, Google, Sheets, Drive, billing, payment, or production APIs.
- Preserve the real-auth `/rn` routes and existing server-backed app. No login bypass or mock identity may reach protected APIs.

## Verification

- Verify all screens and mock interactions in the browser at `/rn/demo`.
- Inspect requests to confirm the demo route makes no `/api/*` calls.
- Run Expo tests/typecheck/export and root typecheck/build; update `STATE.md` and results.
