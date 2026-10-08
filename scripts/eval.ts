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
import {
    addScore,
    emptyTotals,
    percent,
    scoreCase,
    type EvalCase,
    type Totals,
} from "../src/lib/eval-score";

type LabelsFile = { cases?: EvalCase[] } | EvalCase[];

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

function loadLabels(file: string): EvalCase[] {
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

type RunResult = {
    file: string;
    ok: boolean;
    error?: string;
    wrongUnflagged: number;
    misses: string[];
};

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

    const totals: Totals = emptyTotals();
    const results: RunResult[] = [];
    let skipped = 0;
    const skippedFiles: string[] = [];

    console.log(
        `Eval: ocr=${config.PADDLEOCR_MODEL} model=${config.DEEPSEEK_MODEL} provider=${config.EXTRACT_PROVIDER}`
    );
    console.log(`Labels: ${args.labels} (${labels.length} case(s))`);

    for (const item of labels) {
        const imagePath = findImage(args.images, item.file);
        if (!imagePath) {
            skipped += 1;
            skippedFiles.push(item.file);
            continue;
        }

        const bytes = readFileSync(imagePath);
        const ext = path.extname(imagePath).toLowerCase();
        const file = new File([bytes], path.basename(imagePath), {
            type: MIME[ext] ?? "image/jpeg",
        });

        const result = await runExtraction(file);
        if (!result.ok) {
            results.push({
                file: item.file,
                ok: false,
                error: result.error,
                wrongUnflagged: 0,
                misses: [],
            });
            continue;
        }

        const score = scoreCase(item, result.receipt);
        addScore(totals, score);
        results.push({
            file: item.file,
            ok: true,
            wrongUnflagged: score.wrongUnflagged,
            misses: score.misses,
        });
        if (!args.json) {
            console.log(
                `  ${item.file}: ${result.receipt.line_items.length} item(s), wrong+unflagged=${score.wrongUnflagged}`
            );
        }
    }

    const summary = {
        ocr: config.PADDLEOCR_MODEL,
        model: config.DEEPSEEK_MODEL,
        provider: config.EXTRACT_PROVIDER,
        cases: totals.cases,
        skipped,
        skippedFiles,
        accuracy: {
            merchant: percent(totals.merchant),
            date: percent(totals.date),
            total: percent(totals.total),
            itemAmount: percent(totals.itemAmount),
            itemDescription: percent(totals.itemDescription),
            itemCount: percent(totals.itemCount),
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
    console.log(`  merchant        ${percent(totals.merchant)}  (${totals.merchant.correct}/${totals.merchant.total})`);
    console.log(`  date            ${percent(totals.date)}  (${totals.date.correct}/${totals.date.total})`);
    console.log(`  total           ${percent(totals.total)}  (${totals.total.correct}/${totals.total.total})`);
    console.log(`  item amount     ${percent(totals.itemAmount)}  (${totals.itemAmount.correct}/${totals.itemAmount.total})`);
    console.log(`  item desc       ${percent(totals.itemDescription)}  (${totals.itemDescription.correct}/${totals.itemDescription.total})`);
    console.log(`  item count      ${percent(totals.itemCount)}  (${totals.itemCount.correct}/${totals.itemCount.total})`);
    console.log("");
    console.log(`wrong and unflagged: ${totals.wrongUnflagged}`);
    if (skipped > 0) {
        console.log(`skipped (no image): ${skipped} (${skippedFiles.join(", ")})`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
