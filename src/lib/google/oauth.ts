import { OAuth2Client } from "google-auth-library";

/** Sheets read/write. */
export const GOOGLE_SHEETS_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets";

/**
 * Files created or opened by this app only (not full Drive).
 * Needed to search by name for find-or-create `[zippp]` sheets.
 * Existing tokens without this scope must re-consent (Disconnect → Sign in).
 */
export const GOOGLE_DRIVE_FILE_SCOPE =
  "https://www.googleapis.com/auth/drive.file";

export const GOOGLE_OAUTH_SCOPES = [
  GOOGLE_SHEETS_SCOPE,
  GOOGLE_DRIVE_FILE_SCOPE,
] as const;

export function googleRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/api/auth/callback"
  );
}

export function googleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

export function createOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required. See .env.example."
    );
  }
  return new OAuth2Client(clientId, clientSecret, googleRedirectUri());
}

export function buildConsentUrl(client: OAuth2Client, state: string): string {
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_OAUTH_SCOPES],
    state,
  });
}

/**
 * Resolve a stable Google user id from the access token.
 * Sheets/Drive scopes: use tokeninfo `sub` when present; else a local placeholder.
 */
export async function resolveGoogleUserId(
  client: OAuth2Client,
  accessToken: string
): Promise<string> {
  try {
    const info = await client.getTokenInfo(accessToken);
    if (info.sub) return info.sub;
  } catch {
    // fall through
  }
  return "google-user";
}
