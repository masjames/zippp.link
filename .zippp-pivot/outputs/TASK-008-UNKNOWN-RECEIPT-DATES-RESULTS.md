# TASK-008 — Unknown Receipt Dates

**Result:** Web behavior verified with synthetic receipts. Android source was updated but native build/device verification is deferred to the owner's Mac.

- A missing extracted date remains empty in review and is submitted as `null` unless the user enters a date.
- Restoring an old web draft clears a date marked as automatically assumed, while retaining an explicitly edited date.
- Web and Android correction telemetry now records a user-entered date; obsolete assumed-date labels were removed. Generated Android string resources match `spec/wording.txt`.

| Check | Result |
|---|---|
| Focused `batch-db.test.ts` and `correction-diff.test.ts` | 13 passed, 0 failed. |
| `npm test` | 97 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit --incremental false` | Passed. |
| `npm run build` | Passed in an isolated workspace. |
| `npm run android:strings` in an isolated workspace | Passed; generated `strings.xml` matched the repository copy. |
| Browser `/app/snap` | With a synthetic extraction response whose date was `null`, the Date field was empty. Accepting sent `receipt.date: null` to an intercepted append request. Entering `2026-02-01` sent that value instead. |

Browser auth, workspace, extraction, and append responses were synthetic/intercepted. No real Sheet, Drive, payment, or customer data was accessed. The preview server and disposable workspace were removed. Android compilation and device behavior were not verified on this host.
