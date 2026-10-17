import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
    deleteDonationFile,
    donationDriveConfigured,
    uploadDonation,
} from "@/lib/google/drive-donation";
import { readJsonArray, writeJsonArray } from "@/lib/json-store";

/**
 * Opt-in receipt donations. A user can choose to save a photo that could not be
 * read, to improve the harness. Only the image and the failure reason are kept:
 * no user id, no extracted values, no other data.
 */

export type Contribution = {
    id: string;
    at: number;
    pathname: string;
    reason: string | null;
    lang: string | null;
    bytes: number;
    type: string;
};

const KEY = "contributed/index.json";
const MAX = 2000;

function contributionDir(): string {
    return process.env.ZIPPP_DATA_DIR
        ? `${process.env.ZIPPP_DATA_DIR}/contributions`
        : `${process.cwd()}/.data/contributions`;
}

/** Opaque on purpose, so the bundler does not trace a dynamic path. */
function localFile(id: string, ext: string): string {
    const name = `${id}.${ext}`
        .split(/[^a-zA-Z0-9_.-]+/)
        .filter(Boolean)
        .join("_");
    return [contributionDir(), name].join(path.sep);
}

export function listContributions(): Promise<Contribution[]> {
    return readJsonArray<Contribution>(KEY);
}

export async function getContribution(id: string): Promise<Contribution | null> {
    const all = await listContributions();
    return all.find((item) => item.id === id) ?? null;
}

export async function deleteContribution(id: string): Promise<boolean> {
    const all = await listContributions();
    const record = all.find((item) => item.id === id);
    if (!record) return false;
    try {
        if (record.pathname.startsWith("local:")) {
            await fs.unlink(record.pathname.slice("local:".length));
        } else if (record.pathname.startsWith("drive:")) {
            await deleteDonationFile(record.pathname.slice("drive:".length));
        }
    } catch {
        /* best effort, remove the index entry regardless */
    }
    await writeJsonArray(
        KEY,
        all.filter((item) => item.id !== id)
    );
    return true;
}

export async function saveContribution(
    image: File,
    meta: { reason?: string | null; lang?: string | null }
): Promise<Contribution> {
    const id = randomUUID();
    const type = image.type || "image/jpeg";
    const ext = type.includes("png") ? "png" : "jpg";
    const bytes = Buffer.from(await image.arrayBuffer());

    let pathname = "";
    if (donationDriveConfigured()) {
        const uploaded = await uploadDonation(
            bytes,
            type,
            `donation-${id}.${ext}`
        );
        pathname = `drive:${uploaded.id}`;
    } else {
        const file = localFile(id, ext);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, bytes);
        pathname = `local:${file}`;
    }

    const record: Contribution = {
        id,
        at: Date.now(),
        pathname,
        reason: meta.reason ? meta.reason.slice(0, 200) : null,
        lang: meta.lang ? meta.lang.slice(0, 8) : null,
        bytes: image.size,
        type,
    };
    const all = await listContributions();
    all.unshift(record);
    await writeJsonArray(KEY, all.slice(0, MAX));
    return record;
}
