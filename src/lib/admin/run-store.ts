import { readJsonArray, writeJsonArray } from "@/lib/json-store";
import {
    addScore,
    emptyTotals,
    percent,
    scoreCase,
    type EvalCase,
    type Totals,
} from "@/lib/eval-score";
import type { Receipt } from "@/types/receipt";

/**
 * Stored eval runs, so the admin eval page is self-sufficient: upload, run,
 * and the set accumulates with a per-method summary. Admin-only, stores the
 * extracted values but never the image.
 */

export type MethodRun = {
    method: string;
    ok: boolean;
    error?: string | null;
    receipt: Receipt | null;
};

export type StoredRun = {
    id: string;
    at: number;
    imageHash: string;
    file: string;
    expected: EvalCase;
    methods: MethodRun[];
};

const KEY = "admin-eval/runs.json";
const MAX = 1000;

export function listRuns(): Promise<StoredRun[]> {
    return readJsonArray<StoredRun>(KEY);
}

/** Replace the run for an image, so re-running a photo updates it instead of piling up. */
export async function upsertRun(run: StoredRun): Promise<void> {
    const all = await listRuns();
    const index = all.findIndex((item) => item.imageHash === run.imageHash);
    if (index === -1) all.unshift(run);
    else all[index] = run;
    await writeJsonArray(KEY, all.slice(0, MAX));
}

export type EvalSummary = {
    runs: number;
    scored: number;
    rows: {
        method: string;
        cases: number;
        failures: number;
        accuracy: {
            merchant: string;
            date: string;
            total: string;
            itemAmount: string;
            itemCount: string;
        };
        wrongUnflagged: number;
    }[];
};

function hasLabel(label: EvalCase | undefined): boolean {
    if (!label) return false;
    return (
        label.merchant !== undefined ||
        label.date !== undefined ||
        label.total !== undefined ||
        (label.items?.length ?? 0) > 0
    );
}

export async function evalSummary(): Promise<EvalSummary> {
    const runs = await listRuns();
    const totals = new Map<string, Totals>();
    const failures = new Map<string, number>();

    const ensure = (method: string) => {
        if (!totals.has(method)) {
            totals.set(method, emptyTotals());
            failures.set(method, 0);
        }
    };

    let scored = 0;
    for (const run of runs) {
        const label = hasLabel(run.expected);
        if (label) scored += 1;
        for (const result of run.methods ?? []) {
            ensure(result.method);
            if (!result.ok || !result.receipt) {
                failures.set(result.method, (failures.get(result.method) ?? 0) + 1);
                continue;
            }
            if (label) {
                addScore(
                    totals.get(result.method) as Totals,
                    scoreCase(run.expected, result.receipt)
                );
            }
        }
    }

    return {
        runs: runs.length,
        scored,
        rows: [...totals.entries()].map(([method, total]) => ({
            method,
            cases: total.cases,
            failures: failures.get(method) ?? 0,
            accuracy: {
                merchant: percent(total.merchant),
                date: percent(total.date),
                total: percent(total.total),
                itemAmount: percent(total.itemAmount),
                itemCount: percent(total.itemCount),
            },
            wrongUnflagged: total.wrongUnflagged,
        })),
    };
}
