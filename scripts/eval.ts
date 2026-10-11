/**
 * Eval harness for the extraction pipeline.
 *
 * Modes:
 *   --init      write eval/labels.json with one empty case per photo found
 *   --compare   run all four methods per photo and print per-method accuracy
 *   (default)   run the production pipeline and print per-field accuracy
 *   --list      print the case files
 *
 * Usage:
 *   npm run eval -- --init
 *   npm run eval -- --compare
 *   npm run eval -- --ocr PP-OCRv6 --model deepseek-flash
 *   npm run eval -- --list
 *   npm run eval -- --json
 *
 * Model switching happens through env before the pipeline is imported. The
 * compare mode calls the paid models, so it is run deliberately.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
    addScore,
    emptyTotals,
    percent,
    scoreCase,
    type EvalCase,
    type Totals,
} from "../src/lib/eval-score";

type LabelsFile = { notes?: string; cases?: EvalCase[] } | EvalCase[];

type Args = {
    labels: string;
    images: string;
    ocr: string | null;
    model: string | null;
    provider: string | null;
    list: boolean;
    json: boolean;
    init: boolean;
    compare: boolean;
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
        init: false,
        compare: false,
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
        else if (arg === "--init") args.init = true;
        else if (arg === "--compare") args.compare = true;
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

function isImage(name: string): boolean {
    return path.extname(name).toLowerCase() in MIME;
}

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

function fileFor(imagePath: string): File {
    const bytes = readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    return new File([bytes], path.basename(imagePath), {
        type: MIME[ext] ?? "image/jpeg",
    });
}

/** Write a labels.json skeleton with one empty case per photo. */
function writeLabelsTemplate(imagesDir: string, labelsFile: string) {
    const files = existsSync(imagesDir)
        ? readdirSync(imagesDir).filter(isImage).sort()
        : [];
    const cases = files.map((file) => ({ file }));
    const out = {
        notes:
            "Fill merchant, date, total and items per file. A field left out is not scored. Method wins are recorded in /admin/eval.",
        cases,
    };
    writeFileSync(labelsFile, `${JSON.stringify(out, null, 2)}\n`, "utf8");
    console.log(`Wrote ${cases.length} case(s) to ${labelsFile}`);
    if (cases.length === 0) {
        console.log(`No images found in ${imagesDir}. Add photos first.`);
    }
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

    if (args.init) {
        writeLabelsTemplate(args.images, args.labels);
        return;
    }

    const labels = loadLabels(args.labels);

    if (args.list) {
        for (const item of labels) console.log(item.file);
        console.log(`${labels.length} case(s) in ${args.labels}`);
        return;
    }

    if (args.ocr) process.env.PADDLEOCR_MODEL = args.ocr;
    if (args.model) process.env.DEEPSEEK_MODEL = args.model;
    if (args.provider) process.env.EXTRACT_PROVIDER = args.provider;

    const config = await import("../src/lib/config");
    const { runExtraction } = await import("../src/lib/extract-pipeline");

    if (args.compare) {
        const { EXTRACT_METHODS } = await import("../src/lib/admin/methods");
        const totalsByMethod = new Map<string, Totals>();
        const failuresByMethod = new Map<string, number>();
        for (const method of EXTRACT_METHODS) {
            totalsByMethod.set(method.id, emptyTotals());
            failuresByMethod.set(method.id, 0);
        }
        let skipped = 0;
        const skippedFiles: string[] = [];

        console.log(
            `Compare: ocr=${config.PADDLEOCR_MODEL} deepseek=${config.DEEPSEEK_MODEL} gemini=${config.GEMINI_MODEL}`
        );
        for (const item of labels) {
            const imagePath = findImage(args.images, item.file);
            if (!imagePath) {
                skipped += 1;
                skippedFiles.push(item.file);
                continue;
            }
            const file = fileFor(imagePath);
            for (const method of EXTRACT_METHODS) {
                const result = await runExtraction(file, { method: method.id });
                if (!result.ok) {
                    failuresByMethod.set(
                        method.id,
                        (failuresByMethod.get(method.id) ?? 0) + 1
                    );
                    continue;
                }
                addScore(
                    totalsByMethod.get(method.id) as Totals,
                    scoreCase(item, result.receipt)
                );
            }
        }

        const summary = EXTRACT_METHODS.map((method) => {
            const totals = totalsByMethod.get(method.id) as Totals;
            return {
                method: method.id,
                cases: totals.cases,
                failures: failuresByMethod.get(method.id) ?? 0,
                accuracy: {
                    merchant: percent(totals.merchant),
                    date: percent(totals.date),
                    total: percent(totals.total),
                    itemAmount: percent(totals.itemAmount),
                    itemCount: percent(totals.itemCount),
                },
                wrongAndUnflagged: totals.wrongUnflagged,
            };
        });

        if (args.json) {
            console.log(JSON.stringify({ skipped, skippedFiles, summary }, null, 2));
            return;
        }

        console.log("");
        console.log("method            cases  merchant date   total  item   wrong+unflagged");
        for (const row of summary) {
            console.log(
                `${row.method.padEnd(17)} ${String(row.cases).padStart(5)}  ` +
                    `${row.accuracy.merchant.padEnd(8)} ${row.accuracy.date.padEnd(6)} ` +
                    `${row.accuracy.total.padEnd(6)} ${row.accuracy.itemAmount.padEnd(6)} ` +
                    `${row.wrongAndUnflagged}` +
                    (row.failures > 0 ? `  (${row.failures} failed)` : "")
            );
        }
        if (skipped > 0) {
            console.log(`skipped (no image): ${skipped} (${skippedFiles.join(", ")})`);
        }
        return;
    }

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
        const result = await runExtraction(fileFor(imagePath));
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
