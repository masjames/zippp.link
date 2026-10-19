import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The Google AI review asked us to prove that Google user data never reaches
 * the AI providers. That holds because the two server paths are disjoint:
 *
 *   photo path:  /api/extract -> extract-pipeline -> PaddleOCR / DeepSeek / Gemini
 *   sheet path:  /api/sheets/append -> spend credit -> Google Sheets API
 *
 * These tests read the sources and fail if a later change joins them. They are
 * deliberately static: importing the modules would not show which store or API
 * client a transitive import pulls in.
 */

function source(rel: string): string {
    return readFileSync(path.join(process.cwd(), rel), "utf8");
}

const PHOTO_PATH = [
    "src/lib/extract-pipeline.ts",
    "src/lib/deepseek.ts",
    "src/lib/paddleocr.ts",
    "src/lib/gemini.ts",
    "src/lib/ocr-compact.ts",
    "src/lib/schema.ts",
    "src/lib/verify-receipt.ts",
    "src/app/api/extract/route.ts",
];

/** Anything that carries Google user data or Google API credentials. */
const GOOGLE_USER_DATA = [
    { label: "google-auth-library", re: /google-auth-library/ },
    { label: "@/lib/google import", re: /from\s+["']@\/lib\/google\// },
    { label: "relative google import", re: /from\s+["']\.{1,2}\/google\// },
    { label: "Sheets API", re: /sheets\.googleapis\.com|spreadsheets\.values/ },
    { label: "Drive API", re: /www\.googleapis\.com\/drive/ },
    { label: "OAuth token", re: /refresh_token|TOKEN_ENCRYPTION_KEY/ },
];

test("the photo path never touches Google user data", () => {
    for (const file of PHOTO_PATH) {
        const text = source(file);
        for (const rule of GOOGLE_USER_DATA) {
            assert.ok(
                !rule.re.test(text),
                `${file} must not reference ${rule.label}: the AI providers receive the photo only`
            );
        }
    }
});

test("/api/extract accepts the image and nothing else", () => {
    const route = source("src/app/api/extract/route.ts");
    const fields = [...route.matchAll(/form\.get\(\s*"([^"]+)"/g)].map(
        (m) => m[1]
    );
    assert.deepEqual(fields, ["image"]);
});

test("the sheet path never touches an AI provider", () => {
    const route = source("src/app/api/sheets/append/route.ts");
    const forbidden = [
        "@/lib/extract-pipeline",
        "@/lib/deepseek",
        "@/lib/paddleocr",
        "@/lib/gemini",
    ];
    for (const mod of forbidden) {
        assert.ok(
            !route.includes(mod),
            `append must not import ${mod}: Google data stays out of the AI path`
        );
    }
});
