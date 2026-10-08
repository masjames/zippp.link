import type { Receipt } from "@/types/receipt";

/**
 * Scoring for the eval harness. Pure and shared by `scripts/eval.ts` and the
 * admin comparison UI, so both report the same numbers, above all the count of
 * values that are wrong and were NOT flagged by the verifier.
 */

export type EvalItem = {
    description?: string;
    qty?: number;
    amount?: number;
};

export type EvalCase = {
    file: string;
    merchant?: string | null;
    date?: string | null;
    items?: EvalItem[];
    total?: number | null;
};

export type Stat = { correct: number; total: number };

export type CaseScore = {
    file: string;
    wrongUnflagged: number;
    /** Which expected fields were present in the label and whether they matched. */
    merchant?: boolean;
    date?: boolean;
    total?: boolean;
    itemAmount: boolean[];
    itemDescription: boolean[];
    itemCount?: boolean;
    /** Paths the verifier flagged, for the UI. */
    flagged: string[];
    /** The wrong field names that were not flagged. */
    misses: string[];
};

export type Totals = {
    merchant: Stat;
    date: Stat;
    total: Stat;
    itemAmount: Stat;
    itemDescription: Stat;
    itemCount: Stat;
    wrongUnflagged: number;
    cases: number;
};

export function emptyTotals(): Totals {
    return {
        merchant: { correct: 0, total: 0 },
        date: { correct: 0, total: 0 },
        total: { correct: 0, total: 0 },
        itemAmount: { correct: 0, total: 0 },
        itemDescription: { correct: 0, total: 0 },
        itemCount: { correct: 0, total: 0 },
        wrongUnflagged: 0,
        cases: 0,
    };
}

function normalizeText(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function sameText(
    a: string | null | undefined,
    b: string | null | undefined
): boolean {
    const x = normalizeText(a);
    const y = normalizeText(b);
    if (!x || !y) return x === y;
    return x === y || x.includes(y) || y.includes(x);
}

export function sameNumber(
    a: number | null | undefined,
    b: number | null | undefined
): boolean {
    if (a == null || b == null) return a === b;
    return Math.abs(a - b) <= 0.5;
}

function add(stat: Stat, ok: boolean) {
    stat.total += 1;
    if (ok) stat.correct += 1;
}

export function percent(stat: Stat): string {
    if (stat.total === 0) return "n/a";
    return `${Math.round((stat.correct / stat.total) * 100)}%`;
}

/** Score one extraction against one label. */
export function scoreCase(label: EvalCase, receipt: Receipt): CaseScore {
    const flagged = (receipt.flags ?? []).map((flag) => flag.path);
    const flaggedSet = new Set(flagged);
    const misses: string[] = [];
    const score: CaseScore = {
        file: label.file,
        wrongUnflagged: 0,
        itemAmount: [],
        itemDescription: [],
        flagged,
        misses,
    };

    const note = (path: string, field: string, ok: boolean) => {
        if (!ok && !flaggedSet.has(path)) {
            score.wrongUnflagged += 1;
            misses.push(field);
        }
    };

    if (label.merchant !== undefined) {
        score.merchant = sameText(receipt.merchant, label.merchant);
        note("merchant", "merchant", score.merchant);
    }
    if (label.date !== undefined) {
        score.date = sameText(receipt.date, label.date);
        note("date", "date", score.date);
    }
    if (label.total !== undefined) {
        score.total = sameNumber(receipt.total, label.total);
        note("total", "total", score.total);
    }

    const expectedItems = label.items ?? [];
    if (expectedItems.length > 0) {
        score.itemCount = receipt.line_items.length === expectedItems.length;
        expectedItems.forEach((expected, i) => {
            const got = receipt.line_items[i];
            const amountOk = sameNumber(got?.amount, expected.amount);
            score.itemAmount.push(amountOk);
            note(`line_items[${i}].amount`, `line_items[${i}].amount`, amountOk);
            if (expected.description !== undefined) {
                score.itemDescription.push(
                    sameText(got?.description, expected.description)
                );
            }
        });
    }

    return score;
}

export function addScore(totals: Totals, score: CaseScore): void {
    totals.cases += 1;
    totals.wrongUnflagged += score.wrongUnflagged;
    if (score.merchant !== undefined) add(totals.merchant, score.merchant);
    if (score.date !== undefined) add(totals.date, score.date);
    if (score.total !== undefined) add(totals.total, score.total);
    score.itemAmount.forEach((ok) => add(totals.itemAmount, ok));
    score.itemDescription.forEach((ok) => add(totals.itemDescription, ok));
    if (score.itemCount !== undefined) add(totals.itemCount, score.itemCount);
}
