# TASK-007 — Web Draft Recovery

**Result:** Verified in the existing web capture flow using synthetic data. IndexedDB storage is not encrypted or isolated by signed-in account; this task does not establish either property.

- Interrupted extraction resumes from the queue. Interrupted or accepted sends return to review instead of sending automatically.
- IndexedDB operations settle only when their transactions commit or abort. Storage failures display a localized warning.
- The Promise constructor is retained for browsers without `Promise.withResolvers`.

| Check | Result |
|---|---|
| Focused `node --experimental-transform-types --loader ./scripts/ts-loader.mjs --test src/lib/batch-db.test.ts` | 5 passed, 0 failed. Includes commit, abort, recovery, and missing `Promise.withResolvers`. |
| `npm test` | 95 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit --incremental false` | Passed. |
| `npm run build` | Passed in an isolated workspace. |
| Browser, `/app/snap` | Actual app displayed the storage warning when IndexedDB was denied. A synthetic upload recovered after interrupted extraction; an interrupted synthetic send returned to review on reload without a second append request. The final implementation was also reloaded and showed the recovered review without an automatic append. |

The browser used synthetic auth/workspace/extraction responses, intercepted append requests, and a synthetic image. No Google Sheet, Drive, payment, deployment, or customer data was accessed. The isolated workspace and preview server were removed after verification.
