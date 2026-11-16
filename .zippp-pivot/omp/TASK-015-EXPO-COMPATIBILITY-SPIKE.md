# P2.1 — Expo compatibility spike

**Status:** In progress. Isolated client only.  
**Goal:** Verify that an Expo Router / React Native screen can export for web without replacing the existing Next.js app, Kotlin app, or backend.

## Scope

- Add a standalone app under `apps/expo-compat/` with its own package manifest and lockfile.
- Use a minimal shared React Native component and Expo Router root route.
- Do not move, delete, or rewrite existing app/backend code.
- Do not add authentication, Google APIs, storage, financial data, camera, or billing behavior.
- Use the supported Node LTS runtime for the chosen Expo SDK. Native device builds are deferred to the owner's Mac.

## Acceptance

- Expo web static export succeeds from the isolated app.
- TypeScript check succeeds.
- Browser opens the exported web app and renders the shared screen.
- Results and next slice are recorded in `.zippp-pivot/outputs/TASK-015-EXPO-COMPATIBILITY-RESULTS.md` and `.zippp-pivot/omp/STATE.md`.
- Android/iOS native build acceptance remains open until verified on Mac; this spike must not be reported as a completed cross-platform migration.
