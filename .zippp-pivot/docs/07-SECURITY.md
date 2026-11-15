# 07 — Security, Privacy, Permissions, and Financial Integrity

**Scope:** product safety requirements and verification. This is not a completed security assessment or legal opinion.

## Data classification

| Data | Sensitivity | Storage and access |
|---|---|---|
| Session credentials, Google refresh tokens | critical | server-only encrypted, narrowly scoped; device stores only necessary session token in secure storage |
| Receipt images and OCR texts | sensitive financial | encrypted local and user's Drive; transient, access-controlled OCR processing; no advertising pixels |
| Transactions, accounts, bills, savings | sensitive financial | user-owned Sheet as committed truth; encrypted local pending queue and minimal Redis projection |
| Device/entitlement state and idempotency | sensitive operational | server-controlled Upstash/DB with expiry policies and identity segregation |
| Aggregate metrics | sensitive when linkable | de-identify where possible; avoid sending raw values to third-party analytics |

## Non-negotiable privacy rules

1. No Google OAuth refresh tokens on device or passed through receipt OCR requests.
2. Google account identity in bearer token must match resource identity, scope and owner; **never** fallback to a shared `google-user` key.
3. Receipt input to OCR contains only what the user has chosen to scan. No uploads to model providers of account balances or full Sheet history.
4. Do not describe Sheets cells as end-to-end encrypted while the user can view/edit plaintext rows. Distinguish HTTPS transport, token encryption, device encryption and encryption of application-controlled caches.
5. Google Sheets edits made directly by user are allowed but must be parsed, validated, and reconciled safely.
6. Image evidence goes to **user-controlled Drive**, with transparent deletion and visibility; no permanent image mirror on ZIPPP infra.
7. Spreadsheet formula injection defense applies to all user/OCR text: escape `= + - @ tab CR` prefixes and use server-constructed hyperlinks.
8. Google Drive `drive.file` scope may permit app-created/selected files only; evaluate actual consent and cross-device draft behavior before promising arbitrary file access.
9. Redis is not an account ledger; avoid raw documents and long-lived full transaction history there.
10. Explicit user intent and a stable operation ID for any financial mutation; server does not trust local number formatting or client entitlement.
11. No debug logging of auth tokens, Google grant codes, preview bypass secrets, images or unredacted financial payloads.
12. Every correction, bill payment and savings transfer is auditable and reversible through traceable records.

## Authorization and threat scenarios

- Cross-account user A tries to read user B's Sheet/Drive: deny at API and storage key, with tests.
- Old mobile bearer calls billing/checkout: must comply with platform and product policy; separate web payment auth flows.
- Replayed `op_id` with changed payload: reject with idempotency conflict; never interpret as a new transaction.
- Two simultaneous approvals of the same `receipt_id`: one commit, one duplicate acknowledgement.
- OAuth scope revoked between capture and approval: keep local draft; prompt grant recovery; no misleading Synced status.
- Malicious OCR merchant content starts `=IMPORTXML`, `+SUM`, etc.: store harmless text, not formula.
- Uploaded XLSX/CSV zip bomb or parser exploit: hard bounds; use researched library pins only after re-verifying security and package compatibility.
- A user changes their Sheet manually and cache holds old total: refresh/manual sync invalidates and recomputes, shows freshness.
- Lost/stolen phone: secure token revocation, locked-device key storage, local draft deletion guidance.

## Operational security gates

Before beta: run dependency audit, test endpoint authorization matrix, verify OAuth consent scopes and publication requirements in both countries, document retention/deletion, prove idempotency on a test Sheet, instrument redacted error logs, and execute an offline/reconnect recovery drill. Play/App Store subscription and external checkout rules require fresh policy/legal review. Do not treat older DEC-002 as an assurance of store approval.

## Owner decisions required

- Whether unapproved receipt images are automatically backed up to Drive (recommend opt-in with clear consent).
- How long to retain local drafts and OCR metadata; whether approved photos are kept by default.
- Whether to support Google Drive read-only selection of any existing photo or app-owned folder only.
- Whether Redis can hold encrypted recent transaction descriptions or only aggregates; favor smallest data footprint.
