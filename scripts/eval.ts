/**
 * Eval harness for the extraction pipeline.
 *
 * Runs `runExtraction` over a folder of labeled receipt photos and prints
 * per-field accuracy plus the count that matters most: values that are wrong
 * and NOT flagged. Real photos are supplied by the operator in `eval/images/`
 * and are never committed.
 *
 * Usage:
 *   npm run eval -- --labels eval/labels.json
 *   npm run eval -- --ocr PP-OCRv6 --model deepseek-flash
 *   npm run eval -- --ocr PaddleOCR-VL-1.6 --model deepseek-pro
 *   npm run eval -- --list
 *   npm run eval -- --json
 *
 * Model switching is done through env before the pipeline is imported, so the
 * config module reads the requested models. This does not call paid APIs on its
 * own; it runs whatever the caller points it at.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Receipt } from "../src/types/receipt";

type ItemLabel = {
    description?: string;
    qty?: number;
    amount?: number;
};

type CaseLabel = {
    file: string;
    merchant?: string | null;
    date?: string | null;
    items?: ItemLabel[];
    total?: number | null;
};

type LabelsFile = { cases?: CaseLabel[] } | CaseLabel[];

type Args = {
    labels: string;
    images: string;
    ocr: string | null;
    model: string | null;
    provider: string | null;
    list: boolean;
    json: boolean;
};

function parseArgs(argv: string[]): Args {
    const args: Args = {
        labels: "eval/labels.json",
        images: "eval/images",
        ocr: null,
        model: null,
        provider: null,
        list: false,
        json: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const next = () => argv[++i];
        if (arg === "--labels") args.labels = next();
        else if (arg === "--images") args.images = next();
        else if (arg === "--ocr") args.ocr = next();
        else if (arg === "--model") args.model = next();
        else if (arg === "--provider") args.provider = next();
        else if (arg === "--list") args.list = true;
        else if (arg === "--json") args.json = true;
    }
    return args;
}

function loadLabels(file: string): CaseLabel[] {
    if (!existsSync(file)) {
        console.error(`Labels file not found: ${file}`);
        return [];
    }
    const parsed = JSON.parse(readFileSync(file, "utf8")) as LabelsFile;
    return Array.isArray(parsed) ? parsed : (parsed.cases ?? []);
}

const MIME: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
};

function findImage(imagesDir: string, file: string): string | null {
    if (existsSync(file)) return file;
    const joined = path.join(imagesDir, file);
    if (existsSync(joined)) return joined;
    if (existsSync(imagesDir)) {
        const base = path.basename(file).toLowerCase();
        const hit = readdirSync(imagesDir).find(
            (name) => name.toLowerCase() === base
        );
        if (hit) return path.join(imagesDir, hit);
    }
    return null;
}

function normalizeText(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
    const x = normalizeText(a);
    const y = normalizeText(b);
    if (!x || !y) return x === y;
    return x === y || x.includes(y) || y.includes(x);
}

function sameNumber(a: number | null | undefined, b: number | null | undefined): boolean {
    if (a == null || b == null) return a === b;
    return Math.abs(a - b) <= 0.5;
}

type Stat = { correct: number; total: number };

function add(stat: Stat, ok: boolean) {
    stat.total += 1;
    if (ok) stat.correct += 1;
}

function pct(stat: Stat): string {
    if (stat.total === 0) return "n/a";
    return `${Math.round((stat.correct / stat.total) * 100)}%`;
}

type CaseResult = {
    file: string;
    ok: boolean;
    error?: string;
    wrongUnflagged: number;
};

type Totals = {
    merchant: Stat;
    date: Stat;
    total: Stat;
    itemAmount: Stat;
    itemDescription: Stat;
    itemCount: Stat;
    wrongUnflagged: number;
    cases: number;
    skipped: number;
    skippedFiles: string[];
};

function flaggedPaths(receipt: Receipt | null): Set<string> {
    return new Set((receipt?.flags ?? []).map((flag) => flag.path));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const labels = loadLabels(args.labels);

    if (args.list) {
        for (const item of labels) console.log(item.file);
        console.log(`${labels.length} case(s) in ${args.labels}`);
        return;
    }

    // Model switching has to happen before the pipeline module loads.
    if (args.ocr) process.env.PADDLEOCR_MODEL = args.ocr;
    if (args.model) process.env.DEEPSEEK_MODEL = args.model;
    if (args.provider) process.env.EXTRACT_PROVIDER = args.provider;

    const config = await import("../src/lib/config");
    const { runExtraction } = await import("../src/lib/extract-pipeline");

    const totals: Totals = {
        merchant: { correct: 0, total: 0 },
        date: { correct: 0, total: 0 },
        total: { correct: 0, total: 0 },
        itemAmount: { correct: 0, total: 0 },
        itemDescription: { correct: 0, total: 0 },
        itemCount: { correct: 0, total: 0 },
        wrongUnflagged: 0,
        cases: 0,
        skipped: 0,
        skippedFiles: [],
    };
    const results: CaseResult[] = [];

    console.log(
        `Eval: ocr=${config.PADDLEOCR_MODEL} model=${config.DEEPSEEK_MODEL} provider=${config.EXTRACT_PROVIDER}`
    );
    console.log(`Labels: ${args.labels} (${labels.length} case(s))`);

    for (const item of labels) {
        const imagePath = findImage(args.images, item.file);
        if (!imagePath) {
            totals.skipped += 1;
            totals.skippedFiles.push(item.file);
            continue;
        }
        totals.cases += 1;

        const bytes = readFileSync(imagePath);
        const ext = path.extname(imagePath).toLowerCase();
        const file = new File([bytes], path.basename(imagePath), {
            type: MIME[ext] ?? "image/jpeg",
        });

        const result = await runExtraction(file);
        if (!result.ok) {
            results.push({ file: item.file, ok: false, error: result.error, wrongUnflagged: 0 });
            continue;
        }

        const receipt = result.receipt;
        const flags = flaggedPaths(receipt);
        let wrongUnflagged = 0;
        const note = (pathName: string, wrong: boolean) => {
            if (wrong && !flags.has(pathName)) wrongUnflagged += 1;
        };

        if (item.merchant !== undefined) {
            const ok = sameText(receipt.merchant, item.merchant);
            add(totals.merchant, ok);
            note("merchant", !ok);
        }
        if (item.date !== undefined) {
            const ok = sameText(receipt.date, item.date);
            add(totals.date, ok);
            note("date", !ok);
        }
        if (item.total !== undefined) {
            const ok = sameNumber(receipt.total, item.total);
            add(totals.total, ok);
            note("total", !ok);
        }

        const expectedItems = item.items ?? [];
        if (expectedItems.length > 0) {
            add(totals.itemCount, receipt.line_items.length === expectedItems.length);
            expectedItems.forEach((expected, i) => {
                const got = receipt.line_items[i];
                const amountOk = sameNumber(got?.amount, expected.amount);
                add(totals.itemAmount, amountOk);
                note(`line_items[${i}].amount`, !amountOk);
                if (expected.description !== undefined) {
                    add(
                        totals.itemDescription,
                        sameText(got?.description, expected.description)
                    );
                }
            });
        }

        totals.wrongUnflagged += wrongUnflagged;
        results.push({ file: item.file, ok: true, wrongUnflagged });
        if (!args.json) {
            console.log(
                `  ${item.file}: ${receipt.line_items.length} item(s), wrong+unflagged=${wrongUnflagged}`
            );
        }
    }

    const summary = {
        ocr: config.PADDLEOCR_MODEL,
        model: config.DEEPSEEK_MODEL,
        provider: config.EXTRACT_PROVIDER,
        cases: totals.cases,
        skipped: totals.skipped,
        skippedFiles: totals.skippedFiles,
        accuracy: {
            merchant: pct(totals.merchant),
            date: pct(totals.date),
            total: pct(totals.total),
            itemAmount: pct(totals.itemAmount),
            itemDescription: pct(totals.itemDescription),
            itemCount: pct(totals.itemCount),
        },
        wrongAndUnflagged: totals.wrongUnflagged,
        results,
    };

    if (args.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
    }

    console.log("");
    console.log("Per-field accuracy (correct / seen):");
    console.log(`  merchant        ${pct(totals.merchant)}  (${totals.merchant.correct}/${totals.merchant.total})`);
    console.log(`  date            ${pct(totals.date)}  (${totals.date.correct}/${totals.date.total})`);
    console.log(`  total           ${pct(totals.total)}  (${totals.total.correct}/${totals.total.total})`);
    console.log(`  item amount     ${pct(totals.itemAmount)}  (${totals.itemAmount.correct}/${totals.itemAmount.total})`);
    console.log(`  item desc       ${pct(totals.itemDescription)}  (${totals.itemDescription.correct}/${totals.itemDescription.total})`);
    console.log(`  item count      ${pct(totals.itemCount)}  (${totals.itemCount.correct}/${totals.itemCount.total})`);
    console.log("");
    console.log(`wrong and unflagged: ${totals.wrongUnflagged}`);
    if (totals.skipped > 0) {
        console.log(
            `skipped (no image): ${totals.skipped} (${totals.skippedFiles.join(", ")})`
        );
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
