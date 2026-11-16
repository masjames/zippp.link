# TASK-010 — Web Receipt Inbox

**Result:** Verified locally with synthetic data. Existing IndexedDB storage is not established as encrypted or account-isolated.

- Home shows a count when local receipts are queued. Capture links to `/app/inbox`, which lists existing queue items and their statuses.
- Selecting an item opens that specific item in the existing review flow without sending. New captures select the newest queue item.
- At zero credits, Inbox remains readable but review and capture retain the existing top-up guard.

| Check | Result |
|---|---|
| `npm test` | 102 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit --incremental false` | Passed. |
| `npm run build` | Passed in an isolated workspace. |
| Browser multi-receipt flow | Two synthetic uploads appeared as separate ready items. Selecting the older item opened its review with no append request. Home showed `2 receipts in your inbox`. |
| Browser zero-credit state | Inbox remained readable, showed a top-up explanation, and had no review links. |

Browser authentication, workspace, balance, and extraction responses were intercepted synthetic data. No real Sheet, Drive, payment, or customer data was accessed. The preview server and disposable workspace were removed.
