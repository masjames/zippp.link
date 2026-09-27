# zippp

zippp (zippp.link) turns a receipt or invoice photo into structured data: merchant, date, currency, line items, subtotal, tax, total. Shown as a table with CSV and JSON download. Phase 1 adds Google Sheets as the destination (OAuth + append — append comes in a later step).

**Model:** Google Gemini Flash. Privacy: free tier may train on submitted data; use billing for client receipts.

## Run

```bash
npm install
```

Copy `.env.example` → `.env.local` and fill values (see below).

```bash
npm run dev
```

Open http://localhost:3000.

## Env (server only)

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes (extract) | Gemini mill |
| `GOOGLE_CLIENT_ID` | yes (Sheets OAuth) | OAuth web client id |
| `GOOGLE_CLIENT_SECRET` | yes (Sheets OAuth) | OAuth web client secret |
| `GOOGLE_REDIRECT_URI` | recommended | Default `http://localhost:3000/api/auth/callback` |
| `TOKEN_ENCRYPTION_KEY` | recommended | AES-GCM key for refresh tokens at rest (`openssl rand -hex 32`) |

Never put secrets in `NEXT_PUBLIC_*`.

Tokens live in `.data/google-tokens.json` (gitignored). With `TOKEN_ENCRYPTION_KEY` set, the refresh token is encrypted (AES-256-GCM). Without it, the refresh token is stored with a `plain:` prefix — fine for local only; set the key before any shared/prod use.

## Google sign-in (Phase 1)

1. Visit **Sign in with Google** on the home page, or open `/api/auth/login`.
2. Google consent scopes: **Sheets** (`spreadsheets`) + **Drive file** (`drive.file`) — find/create `[zippp]` sheets owned/opened by this app. Not full Drive, not Gmail.
3. Callback stores refresh token server-side and redirects to `/?auth=ok`.
4. `/api/auth/me` reports `{ signedIn, googleUserId }` (no secrets).
5. **Disconnect Google** hits `/api/auth/logout` and deletes stored tokens **and** workspace sheet config.

### Re-consent required after scope change

Existing tokens from Sheets-only consent **do not** include `drive.file`. After pulling this change: **Disconnect Google → Sign in with Google** again and accept the new Drive file permission. Otherwise Connect spreadsheet will fail with a permission error.

### Connect spreadsheet (no paste URL)

When signed in, click **Connect [zippp] sheet**. The server:

1. Searches Drive for spreadsheets whose name contains `[zippp]` (files this app created/opened).
2. If one clear match → connects it and builds the resto-inventory column map.
3. If several → shows pick buttons (still no paste).
4. If none → creates `[zippp] Resto inventory` with resto-inventory headers and default map (Category → Bahan baku).

Workspace config lives in `.data/workspace.json` (gitignored). Map edit/save still available after connect. **Send / values.append is not in this step.**

### Google Cloud Console setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **APIs & Services → Library** → enable **Google Sheets API** and **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → External (or Internal for Workspace) → app name `zippp` → save. Add scopes `https://www.googleapis.com/auth/spreadsheets` and `https://www.googleapis.com/auth/drive.file` (not full Drive, not Gmail). Add your Google account as a test user while in Testing.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** → Application type **Web application**.
5. Authorized redirect URIs: `http://localhost:3000/api/auth/callback` (and production URL when you have one).
6. Copy Client ID and Client Secret into `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
7. Set `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback`.
8. Generate `TOKEN_ENCRYPTION_KEY` with `openssl rand -hex 32`.
9. Restart `npm run dev`, then use **Sign in with Google** (re-consent if you signed in before drive.file was added).

## Phase 0

Drop a real cafe receipt → Extract → Download CSV/JSON. Still works without Google connected.
