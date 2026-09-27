# zippp architecture

Depends on: `SPEC.md`, `USER-FLOW.md`
Owns: how Phase 1 is built. Not the column dictionary (`TEMPLATES.md`).

---

## Law

**The Google Sheet is the system of record.** zippp extracts, maps, appends. It does not keep a second ledger.

Facts (money, qty, merchant) come from the mill, then a **correct screen**, then Sheets. Do not let the model write straight to the sheet.

---

## Stack

Still **Next.js App Router + TypeScript**. Gemini stays server-side (`GEMINI_API_KEY`).

New:

| Piece | Why |
|---|---|
| Google OAuth 2.0 | User grants write to **their** spreadsheet |
| Google Sheets API | `values.get` (headers), `values.append` (rows) |
| A small persist store | OAuth refresh token + workspace config. Cookie-only dies on a new phone and Charlie’s staff cannot share a connection. |

MVP store can be SQLite or a single Postgres. Not a second product database of receipts. Tokens + config only. Receipt payloads are not retained after a successful append (Phase 1).

---

## Data flow

```
Staff phone
  → photo
  → POST /api/extract          (existing mill)
  → correct screen (client)
  → POST /api/sheets/append    { receipt, staff, outlet, workspace }
       → load map + refresh Google token
       → build rows (one per line)
       → spreadsheets.values.append
  → { ok, rows_written }
```

```mermaid
flowchart LR
  P[Photo] --> X[/api/extract]
  X --> G[Gemini]
  G --> C[Correct screen]
  C --> A[/api/sheets/append]
  A --> S[Google Sheet]
```

Phase 0 CSV/JSON remains on the page if no workspace is connected.

---

## OAuth

- Web client in Google Cloud. Redirect to zippp.
- Scope: spreadsheets (write). Do not take Gmail.
- Refresh token stored encrypted at rest.
- Disconnect deletes tokens.

Service-account “share this sheet with a bot” is allowed as an **ops shortcut for the first Charlie install** if OAuth is late. Product path is user OAuth. Do not ship both as equal forever.

---

## Env

| Name | Where |
|---|---|
| `GEMINI_API_KEY` | server |
| `GOOGLE_CLIENT_ID` | server |
| `GOOGLE_CLIENT_SECRET` | server |
| `GOOGLE_REDIRECT_URI` | server |
| `TOKEN_ENCRYPTION_KEY` | server |
| Store URL / path | server |

Never `NEXT_PUBLIC_` for secrets.

---

## Model

Default still `gemini-2.5-flash` until a Lite bake on real resto notas. Client jobs: billed key, training off.

---

## Failure

Extract fail → no append.  
Sheets 401 → refresh once, then ask Charlie to reconnect.  
Append fail → return error, no “success.”

---

## What this file does not own

Column names (`TEMPLATES.md`). Prices. Full accounting schema.
