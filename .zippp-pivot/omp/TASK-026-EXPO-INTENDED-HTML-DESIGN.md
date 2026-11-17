# TASK-026 — Apply the owner's intended HTML design to Expo

- **Status:** Implemented and verified against the available v0.8 visual reference. A later owner-provided revision can refine parity.

## Scope

- Port the available prototype's screen shell, hierarchy, typography, spacing, and navigation into React Native components in the isolated `/rn/demo` preview.
- Use the prototype for visual direction only. Do not embed its HTML/JavaScript, reuse its illustrative records or local-storage behavior, or call real APIs.
- Keep all interactions on the existing in-memory mock API and preserve the authenticated `/rn` routes.

## Verification

- Compare the Expo `/rn/demo` workbench with the available HTML visual reference at a desktop viewport.
- Verify all screen navigation, mock interactions, and absence of real API requests.
- Record remaining auth/Mac/native gates in `STATE.md` and `.zippp-pivot/outputs/TASK-026-EXPO-INTENDED-HTML-DESIGN-RESULTS.md`.
