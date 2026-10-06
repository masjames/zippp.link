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

/**
 * Email address, used to identify admins and to grant credits by email.
 * Adding this scope requires existing users to re-consent once.
 */
export const GOOGLE_EMAIL_SCOPE =
  "https://www.googleapis.com/auth/userinfo.email";

export const GOOGLE_OAUTH_SCOPES = [
  GOOGLE_SHEETS_SCOPE,
  GOOGLE_DRIVE_FILE_SCOPE,
  GOOGLE_EMAIL_SCOPE,
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

export type GoogleUser = { id: string; email: string | null };

/**
 * Resolve the stable Google user id (`sub`) and email from the access token.
 * Email needs the `userinfo.email` scope; without it, email is null.
 */
export async function resolveGoogleUser(
  client: OAuth2Client,
  accessToken: string
): Promise<GoogleUser> {
  try {
    const info = await client.getTokenInfo(accessToken);
    return { id: info.sub || "google-user", email: info.email ?? null };
  } catch {
    return { id: "google-user", email: null };
  }
}
