import type { OAuth2Client } from "google-auth-library";
import { createOAuthClient } from "./oauth";
import { loadTokens, saveTokens } from "./token-store";
import {
  RESTO_INVENTORY_HEADERS,
  ZIPPP_NAME_MARKER,
  ZIPPP_RESTO_SHEET_TITLE,
} from "./templates";

export class SheetsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetsAuthError";
  }
}

export class SheetsApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SheetsApiError";
    this.status = status;
  }
}

/** A1 range for row 1 of a tab (quote tab name if needed). */
export function headerRange(sheetTab: string): string {
  const escaped = sheetTab.replace(/'/g, "''");
  const needsQuotes = /[^a-zA-Z0-9_]/.test(sheetTab) || sheetTab === "";
  const ref = needsQuotes ? `'${escaped}'` : escaped;
  return `${ref}!1:1`;
}

/**
 * OAuth2 client with stored tokens; refreshes access token and
 * persists updates back to the token store.
 */
export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const stored = await loadTokens();
  if (!stored) {
    throw new SheetsAuthError("Not signed in with Google.");
  }

  const client = createOAuthClient();
  client.setCredentials({
    refresh_token: stored.refresh_token,
    access_token: stored.access_token ?? undefined,
    expiry_date: stored.expiry_date ?? undefined,
  });

  const tokenRes = await client.getAccessToken();
  if (!tokenRes.token) {
    throw new SheetsAuthError(
      "Could not refresh Google access token. Sign in again."
    );
  }

  const creds = client.credentials;
  const newAccess = creds.access_token ?? tokenRes.token;
  const newExpiry = creds.expiry_date ?? null;
  const newRefresh = creds.refresh_token || stored.refresh_token;

  if (
    newAccess !== stored.access_token ||
    newExpiry !== stored.expiry_date ||
    newRefresh !== stored.refresh_token
  ) {
    await saveTokens({
      google_user_id: stored.google_user_id,
      refresh_token: newRefresh,
      access_token: newAccess,
      expiry_date: newExpiry,
    });
  }

  return client;
}

async function accessToken(): Promise<string> {
  const client = await getAuthenticatedClient();
  const token = client.credentials.access_token;
  if (!token) {
    throw new SheetsAuthError("Missing Google access token.");
  }
  return token;
}

type GoogleErrorBody = {
  error?: {
    message?: string;
    status?: string;
    code?: number;
    errors?: { reason?: string; message?: string }[];
  };
};

function mapHttpError(res: Response, body: GoogleErrorBody): Error {
  const message =
    body.error?.message ||
    body.error?.errors?.[0]?.message ||
    `Google API error (${res.status})`;
  const reason = body.error?.errors?.[0]?.reason || "";
  const lower = message.toLowerCase();

  if (
    res.status === 401 ||
    res.status === 403 ||
    reason === "insufficientPermissions" ||
    reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" ||
    lower.includes("insufficient") ||
    lower.includes("access not configured") ||
    lower.includes("drive.file")
  ) {
    return new SheetsAuthError(
      "Google permission missing or denied. Disconnect Google, then Sign in again to grant Sheets + Drive file access (drive.file)."
    );
  }
  if (res.status === 404) {
    return new SheetsApiError(
      "Spreadsheet not found or not accessible.",
      404
    );
  }
  return new SheetsApiError(message, res.status);
}

async function googleFetch<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const token = await accessToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as GoogleErrorBody & T;
  if (!res.ok) {
    throw mapHttpError(res, body);
  }
  return body as T;
}

export type SpreadsheetMeta = {
  spreadsheetId: string;
  title: string;
  sheetTabs: string[];
};

export type DriveSpreadsheetHit = {
  id: string;
  name: string;
  modifiedTime: string | null;
};

export async function getSpreadsheetMeta(
  spreadsheetId: string
): Promise<SpreadsheetMeta> {
  const params = new URLSearchParams({
    fields: "spreadsheetId,properties.title,sheets.properties.title",
  });
  const data = await googleFetch<{
    spreadsheetId?: string;
    properties?: { title?: string };
    sheets?: { properties?: { title?: string } }[];
  }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?${params}`
  );

  const title = data.properties?.title ?? "Untitled";
  const sheetTabs =
    data.sheets
      ?.map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t)) ?? [];

  return {
    spreadsheetId: data.spreadsheetId ?? spreadsheetId,
    title,
    sheetTabs,
  };
}

export async function getHeaderRow(
  spreadsheetId: string,
  sheetTab: string
): Promise<string[]> {
  const range = headerRange(sheetTab);
  const params = new URLSearchParams({
    majorDimension: "ROWS",
  });
  const data = await googleFetch<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?${params}`
  );
  const row = data.values?.[0] ?? [];
  return row.map((cell) => String(cell ?? "").trim()).filter((h) => h !== "");
}

export async function writeHeaderRow(
  spreadsheetId: string,
  sheetTab: string,
  headers: readonly string[]
): Promise<void> {
  const range = headerRange(sheetTab);
  const params = new URLSearchParams({
    valueInputOption: "RAW",
  });
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?${params}`,
    {
      method: "PUT",
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values: [headers],
      }),
    }
  );
}

/**
 * Search Drive for spreadsheets whose name contains `[zippp]`.
 * With drive.file scope, only files this app created/opened are visible.
 */
export async function findZippSpreadsheets(): Promise<DriveSpreadsheetHit[]> {
  const q = [
    "mimeType='application/vnd.google-apps.spreadsheet'",
    "trashed=false",
    `name contains '${ZIPPP_NAME_MARKER}'`,
  ].join(" and ");

  const params = new URLSearchParams({
    q,
    spaces: "drive",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "50",
  });

  const data = await googleFetch<{
    files?: { id?: string; name?: string; modifiedTime?: string }[];
  }>(`https://www.googleapis.com/drive/v3/files?${params}`);

  const marker = ZIPPP_NAME_MARKER.toLowerCase();
  return (data.files ?? [])
    .filter((f) => f.id && f.name && f.name.toLowerCase().includes(marker))
    .map((f) => ({
      id: f.id as string,
      name: f.name as string,
      modifiedTime: f.modifiedTime ?? null,
    }));
}

/** Create a new spreadsheet titled like `[zippp] Resto inventory`. */
export async function createSpreadsheet(
  title: string = ZIPPP_RESTO_SHEET_TITLE
): Promise<SpreadsheetMeta> {
  const data = await googleFetch<{
    spreadsheetId?: string;
    properties?: { title?: string };
    sheets?: { properties?: { title?: string } }[];
  }>("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: "Sheet1" } }],
    }),
  });

  const spreadsheetId = data.spreadsheetId;
  if (!spreadsheetId) {
    throw new SheetsApiError("Spreadsheet create returned no id.", 500);
  }

  const sheetTabs =
    data.sheets
      ?.map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t)) ?? ["Sheet1"];

  return {
    spreadsheetId,
    title: data.properties?.title ?? title,
    sheetTabs,
  };
}

/** Create resto sheet, write spec/TEMPLATES.md headers as row 1. */
export async function createRestoInventorySpreadsheet(): Promise<{
  meta: SpreadsheetMeta;
  sheetTab: string;
  headers: string[];
}> {
  const meta = await createSpreadsheet(ZIPPP_RESTO_SHEET_TITLE);
  const sheetTab = meta.sheetTabs[0] || "Sheet1";
  const headers = [...RESTO_INVENTORY_HEADERS];
  await writeHeaderRow(meta.spreadsheetId, sheetTab, headers);
  return { meta, sheetTab, headers };
}

/**
 * Pick best auto-connect candidate, or null if the UI should choose.
 * Prefer exact `[zippp] Resto inventory` title; else single result only.
 */
export function pickBestZippSheet(
  hits: DriveSpreadsheetHit[]
): DriveSpreadsheetHit | "need_pick" | null {
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0];

  const exact = hits.filter(
    (h) => h.name.trim().toLowerCase() === ZIPPP_RESTO_SHEET_TITLE.toLowerCase()
  );
  if (exact.length === 1) return exact[0];
  // Multiple: already ordered by modifiedTime desc from API
  return "need_pick";
}

/**
 * Append rows to a sheet tab (never overwrite). Prefer USER_ENTERED
 * so dates/numbers are parsed by Sheets when possible.
 */
export async function appendRows(
  spreadsheetId: string,
  sheetTab: string,
  rows: (string | number | boolean)[][]
): Promise<{ updatedRows: number; updatedRange: string | null }> {
  if (rows.length === 0) {
    return { updatedRows: 0, updatedRange: null };
  }

  const escaped = sheetTab.replace(/'/g, "''");
  const needsQuotes = /[^a-zA-Z0-9_]/.test(sheetTab) || sheetTab === "";
  const range = needsQuotes ? `'${escaped}'` : escaped;

  const params = new URLSearchParams({
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
  });

  const data = await googleFetch<{
    updates?: {
      updatedRows?: number;
      updatedRange?: string;
    };
  }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?${params}`,
    {
      method: "POST",
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: rows,
      }),
    }
  );

  return {
    updatedRows: data.updates?.updatedRows ?? rows.length,
    updatedRange: data.updates?.updatedRange ?? null,
  };
}
