import { createHash } from "node:crypto";
import { readJsonArray, writeJsonArray } from "@/lib/json-store";
import type { CorrectionRecord } from "@/lib/correction-diff";

/**
 * Production correction telemetry. Records the field-level diff collected at
 * Accept. No images and no raw values, only edited-or-not plus flag reasons.
 */

export type StoredCorrection = CorrectionRecord & {
    id: string;
    at: number;
    /** Short hash of the session user id, not the id itself. */
    user: string;
    lang?: string | null;
};

const KEY = "corrections/records.json";
const MAX = 5000;

export function hashUser(userId: string): string {
    return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

export function listCorrections(): Promise<StoredCorrection[]> {
    return readJsonArray<StoredCorrection>(KEY);
}

export async function appendCorrection(record: StoredCorrection): Promise<void> {
    const all = await listCorrections();
    all.unshift(record);
    await writeJsonArray(KEY, all.slice(0, MAX));
}

export type CorrectionSummary = {
    total: number;
    boxes: {
        editedFlagged: number;
        editedUnflagged: number;
        leftFlagged: number;
        leftUnflagged: number;
    };
    byField: {
        path: string;
        seen: number;
        edited: number;
        flagged: number;
        wrongUnflagged: number;
        leftFlagged: number;
    }[];
    byReason: { reason: string; seen: number; edited: number }[];
};

export async function correctionSummary(): Promise<CorrectionSummary> {
    const records = await listCorrections();
    const byField = new Map<
        string,
        {
            path: string;
            seen: number;
            edited: number;
            flagged: number;
            wrongUnflagged: number;
            leftFlagged: number;
        }
    >();
    const byReason = new Map<string, { reason: string; seen: number; edited: number }>();
    const boxes = {
        editedFlagged: 0,
        editedUnflagged: 0,
        leftFlagged: 0,
        leftUnflagged: 0,
    };

    for (const record of records) {
        for (const field of record.fields ?? []) {
            const row =
                byField.get(field.path) ??
                {
                    path: field.path,
                    seen: 0,
                    edited: 0,
                    flagged: 0,
                    wrongUnflagged: 0,
                    leftFlagged: 0,
                };
            row.seen += 1;
            if (field.edited) row.edited += 1;
            if (field.flagged) row.flagged += 1;
            if (field.edited && !field.flagged) row.wrongUnflagged += 1;
            if (!field.edited && field.flagged) row.leftFlagged += 1;
            byField.set(field.path, row);

            if (field.edited && field.flagged) boxes.editedFlagged += 1;
            else if (field.edited && !field.flagged) boxes.editedUnflagged += 1;
            else if (!field.edited && field.flagged) boxes.leftFlagged += 1;
            else boxes.leftUnflagged += 1;

            for (const reason of field.reasons ?? []) {
                const r = byReason.get(reason) ?? { reason, seen: 0, edited: 0 };
                r.seen += 1;
                if (field.edited) r.edited += 1;
                byReason.set(reason, r);
            }
        }
    }

    return {
        total: records.length,
        boxes,
        byField: [...byField.values()],
        byReason: [...byReason.values()].sort((a, b) => b.seen - a.seen),
    };
}
