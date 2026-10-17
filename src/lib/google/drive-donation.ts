import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";

/**
 * Donation photo storage in the operator's own Google Drive.
 *
 * Uses a dedicated OAuth refresh token (DONATION_GOOGLE_REFRESH_TOKEN), not the
 * signed-in user's token: `POST /api/auth/logout` deletes the session token and
 * donations must keep working. Scope is `drive.file`, so the app can only see
 * and read files it created. The folder is created on first use.
 *
 * Env:
 *   DONATION_GOOGLE_REFRESH_TOKEN  refresh token for the operator account
 *   DONATION_DRIVE_FOLDER_ID       optional existing folder (else app creates one)
 *   DONATION_DRIVE_FOLDER_NAME     optional folder name, default "[zippp] donations"
 */

const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

const FOLDER_NAME =
    process.env.DONATION_DRIVE_FOLDER_NAME || "[zippp] donations";

let folderCache: string | null = null;

export function donationDriveConfigured(): boolean {
    return Boolean(
        process.env.DONATION_GOOGLE_REFRESH_TOKEN &&
            process.env.GOOGLE_CLIENT_ID &&
            process.env.GOOGLE_CLIENT_SECRET
    );
}

async function accessToken(): Promise<string> {
    const refreshToken = process.env.DONATION_GOOGLE_REFRESH_TOKEN;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!refreshToken || !clientId || !clientSecret) {
        throw new Error("Donation Drive is not configured.");
    }
    const client = new OAuth2Client(clientId, clientSecret);
    client.setCredentials({ refresh_token: refreshToken });
    const res = await client.getAccessToken();
    if (!res.token) {
        throw new Error("Could not refresh the donation Drive token.");
    }
    return res.token;
}

async function driveError(res: Response): Promise<Error> {
    const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
    };
    return new Error(body.error?.message || `Drive API ${res.status}`);
}

async function ensureFolder(token: string): Promise<string> {
    const configured = process.env.DONATION_DRIVE_FOLDER_ID;
    if (configured) return configured;
    if (folderCache) return folderCache;

    const name = FOLDER_NAME.replace(/'/g, "\\'");
    const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${name}' and trashed = false`;
    const listRes = await fetch(
        `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!listRes.ok) throw await driveError(listRes);
    const list = (await listRes.json()) as { files?: { id?: string }[] };
    const found = list.files?.find((f) => f.id)?.id;
    if (found) {
        folderCache = found;
        return found;
    }

    const createRes = await fetch(`${DRIVE}/files?fields=id`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: "application/vnd.google-apps.folder",
        }),
    });
    if (!createRes.ok) throw await driveError(createRes);
    const created = (await createRes.json()) as { id?: string };
    if (!created.id) throw new Error("Drive did not return a folder id.");
    folderCache = created.id;
    return created.id;
}

/** Upload one image to the donation folder. Returns the Drive file id. */
export async function uploadDonation(
    bytes: Buffer,
    type: string,
    name: string
): Promise<{ id: string }> {
    const token = await accessToken();
    const folderId = await ensureFolder(token);
    const boundary = `zippp${randomUUID().replace(/-/g, "")}`;
    const metadata = JSON.stringify({ name, parents: [folderId] });
    const body = Buffer.concat([
        Buffer.from(
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
                `--${boundary}\r\nContent-Type: ${type}\r\n\r\n`
        ),
        bytes,
        Buffer.from(`\r\n--${boundary}--`),
    ]);

    const res = await fetch(`${UPLOAD}/files?uploadType=multipart&fields=id,name`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
    });
    if (!res.ok) throw await driveError(res);
    const data = (await res.json()) as { id?: string };
    if (!data.id) throw new Error("Drive did not return a file id.");
    return { id: data.id };
}

/** Stream one donated image back for the admin viewer. */
export async function getDonationMedia(id: string): Promise<Response | null> {
    const token = await accessToken();
    const res = await fetch(
        `${DRIVE}/files/${encodeURIComponent(id)}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok || !res.body) return null;
    return res;
}

export async function deleteDonationFile(id: string): Promise<void> {
    const token = await accessToken();
    const res = await fetch(`${DRIVE}/files/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) throw await driveError(res);
}
