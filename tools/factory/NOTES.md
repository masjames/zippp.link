# Factory notes

One line per decision. Contracts live in the Pi brief.

- M0: baseline is 43 passing tests and a clean root `tsc`.
- M0: port 8080 is free; the smoke test can use it.
- M0: `tsconfig.json` is clean, so the one-line `tools/factory` exclude is staged explicitly. The brief's commit helper omits it.
- M0: the web package will commit `package-lock.json` for reproducible installs.
- M0: the theme 3 prose specs are pre-existing untracked user files. Only `entities/` is staged.
- Decision: when a human changes an entity status during verification, do not overwrite it. Log the race, store the result with `wrote_status: false`, and broadcast it so the UI clears the running state.
- Decision: omit the `model` check when the body has no ERD entities. This matches the expected three-check e2e for entities without an ERD.
- Decision: an ERD field passes when it appears in at least one target file where the entity declaration matched. Fields are not scoped to the declaration. This known limit is intentional.
