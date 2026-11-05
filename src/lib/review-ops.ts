// @implements FEAT-118
import { parseMoney, type Draft } from "@/components/app/draft";
import type { Receipt, ReceiptFlag } from "@/types/receipt";

/** Flag reasons that block Accept until the field is edited or acknowledged. */
export const HARD_FLAG_REASONS: readonly string[] = [
    "missing",
    "not_in_ocr",
    "ungrounded",
    "arithmetic",
];

export type OpsFields = {
    staff: boolean;
    outlet: boolean;
    payment: boolean;
    customer: boolean;
    purpose: boolean;
};

const NO_OPS: OpsFields = {
    staff: false,
    outlet: false,
    payment: false,
    customer: false,
    purpose: false,
};

/** Extra review card fields per template (context section 4.6). */
export function opsFor(templateId: string | null | undefined): OpsFields {
    switch (templateId) {
        case "resto-inventory":
            return { ...NO_OPS, staff: true, outlet: true };
        case "personal-expense":
            return { ...NO_OPS, payment: true };
        case "sales-recap":
            return { ...NO_OPS, payment: true, customer: true };
        case "reimbursement":
            return { ...NO_OPS, purpose: true };
        default:
            return NO_OPS;
    }
}

function sameText(a: string | null | undefined, b: string | null | undefined) {
    const norm = (v: string | null | undefined) =>
        (v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    return norm(a) === norm(b);
}

function sameNumber(a: number | null, b: number | null) {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return Math.abs(a - b) <= 0.005;
}

/** True when the draft value for this path differs from what was extracted. */
function isEdited(path: string, receipt: Receipt, draft: Draft): boolean {
    switch (path) {
        case "merchant":
            return !sameText(draft.merchant, receipt.merchant);
        case "date":
            return !sameText(draft.date, receipt.date);
        case "subtotal":
        case "tax":
        case "total":
            return !sameNumber(parseMoney(draft[path]), receipt[path]);
    }
    const match = /^line_items\[(\d+)\]\.(description|qty|unit_price|amount)$/.exec(
        path
    );
    if (!match) return false;
    const i = Number(match[1]);
    const line = draft.lines[i];
    const original = receipt.line_items[i];
    if (!line || !original) return true;
    switch (match[2]) {
        case "description":
            return !sameText(line.description, original.description);
        case "qty":
            return !sameNumber(parseMoney(line.qty), original.qty);
        case "unit_price":
            return !sameNumber(parseMoney(line.unitPrice), original.unit_price);
        default:
            return !sameNumber(parseMoney(line.amount), original.amount);
    }
}

/** Hard flags the user has neither edited nor acknowledged. */
export function unresolvedHardFlags(
    receipt: Receipt | null | undefined,
    draft: Draft
): ReceiptFlag[] {
    if (!receipt) return [];
    return (receipt.flags ?? []).filter(
        (flag) =>
            HARD_FLAG_REASONS.includes(flag.reason) &&
            !isEdited(flag.path, receipt, draft)
    );
}

/** Hard flags exist at all, whether or not they were resolved. */
export function hasHardFlags(receipt: Receipt | null | undefined): boolean {
    return (receipt?.flags ?? []).some((flag) =>
        HARD_FLAG_REASONS.includes(flag.reason)
    );
}

/** Accept is blocked while hard flags are unresolved and not acknowledged. */
export function acceptBlocked(
    receipt: Receipt | null | undefined,
    draft: Draft
): boolean {
    if (draft.acknowledged) return false;
    return unresolvedHardFlags(receipt, draft).length > 0;
}

/** Multiple outlets and no default: the server requires an explicit pick. */
export function outletMissing(
    outlets: readonly string[],
    defaultOutlet: string | null,
    chosen: string
): boolean {
    return outlets.length > 1 && !defaultOutlet && chosen.trim() === "";
}
