import { parseMoney } from "@/components/app/draft";
import type { Receipt } from "@/types/receipt";

/**
 * Field-level diff between what zippp extracted and what the user accepted.
 * Collected at Accept as a free production signal. No images and no raw values
 * are recorded, only whether a field was edited and whether it was flagged.
 *
 * Four boxes per field:
 *   edited + flagged      -> the system worked
 *   edited + not flagged  -> wrong and unflagged, the north-star number
 *   left + flagged        -> the verifier was too noisy
 *   left + not flagged    -> probably correct
 */

export type CorrectionField = {
    path: string;
    edited: boolean;
    flagged: boolean;
    reasons: string[];
};

export type CorrectionRecord = {
    runId: string | null;
    countChanged: boolean;
    fields: CorrectionField[];
};

export type CorrectionDraft = {
    merchant: string;
    date: string;
    total: string;
    lines: { description: string; qty: string; amount: string }[];
    dateAssumed?: boolean;
};

function normText(value: string | null | undefined): string {
    return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
    return normText(a) === normText(b);
}

function sameNumber(a: number | null, b: number | null): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return Math.abs(a - b) <= 0.005;
}

export function buildCorrectionRecord(args: {
    receipt: Receipt;
    draft: CorrectionDraft;
    runId: string | null;
}): CorrectionRecord {
    const { receipt, draft, runId } = args;
    const reasonByPath = new Map(
        (receipt.flags ?? []).map((flag) => [flag.path, flag.reason])
    );

    const fields: CorrectionField[] = [];
    const add = (path: string, edited: boolean) => {
        const reason = reasonByPath.get(path);
        fields.push({
            path,
            edited,
            flagged: reasonByPath.has(path),
            reasons: reason ? [reason] : [],
        });
    };

    add("merchant", !sameText(draft.merchant, receipt.merchant ?? ""));

    // An assumed date was filled by the client from the capture time, so it is
    // not an extraction error and is excluded.
    if (!draft.dateAssumed) {
        add("date", !sameText(draft.date, receipt.date ?? ""));
    }

    add("total", !sameNumber(parseMoney(draft.total), receipt.total));

    const draftLines = draft.lines.filter(
        (line) => line.description.trim() || line.qty.trim() || line.amount.trim()
    );
    const receiptLines = receipt.line_items;
    const countChanged = draftLines.length !== receiptLines.length;
    const count = Math.max(draftLines.length, receiptLines.length);
    for (let i = 0; i < count; i++) {
        const draftLine = draftLines[i];
        const receiptLine = receiptLines[i];
        add(
            `line_items[${i}].description`,
            !sameText(draftLine?.description ?? "", receiptLine?.description ?? "")
        );
        add(
            `line_items[${i}].qty`,
            !sameNumber(parseMoney(draftLine?.qty ?? ""), receiptLine?.qty ?? null)
        );
        add(
            `line_items[${i}].amount`,
            !sameNumber(parseMoney(draftLine?.amount ?? ""), receiptLine?.amount ?? null)
        );
    }

    return { runId, countChanged, fields };
}
