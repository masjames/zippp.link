# TASK-026 — Apply the owner's intended HTML design to Expo

**Status:** Pending the owner-provided intended HTML reference. The current v0.8 prototype is only an interim layout cue and does not establish visual acceptance.

## Scope

- After the owner adds the intended HTML to the repository, inspect it and translate its design into React Native components for the isolated `/rn/demo` preview.
- Keep mock APIs/in-memory demo data isolated; do not use a WebView, call real APIs, or copy prototype demo records into the authenticated app.
- Preserve the existing real-auth `/rn` routes.

## Verification

- Compare the Expo mock UI against the owner-provided reference in a browser at the target viewport.
- Verify screen navigation and that all interactions stay within the mock API.
- Record the completed visual slice and remaining real-auth/Mac/native gates in `STATE.md`.
