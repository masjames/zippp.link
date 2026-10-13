/**
 * Humanize spec/wording.txt in place.
 *
 * Uses the free DiaIQ humanizer (no auth): POST https://humanizer.diaiq.com/api/humanize
 * with { text, passes }. See the humanize skill for background.
 *
 * Usage:
 *   node scripts/humanize-wording.mjs [passes] [minWords] [delayMs]
 *   # passes   default 1  (1 is usually enough; 2-3 rewrite more)
 *   # minWords default 3  (shorter values are labels, left alone)
 *   # delayMs  default 250 (keep it sequential; the API rate limits)
 *
 * What it does NOT touch, on purpose:
 *   - multi-line values (legal page bodies with `#` headings and `-` lists)
 *   - values shorter than minWords (buttons, labels)
 *   - values whose line starts with `#` or `-`
 *
 * It keeps the keys and the exact inter-entry whitespace, and it rejects any
 * output that drops a {placeholder}, adds an em dash, loses the zippp brand,
 * or drifts too far in length. Rejected values keep their original text.
 *
 * Run only on a clean git tree so `git diff spec/wording.txt` is reviewable.
 * After running: `npx tsc --noEmit`, `npm run build`, then read the diff.
 */
import fs from "node:fs";

const path = "spec/wording.txt";
const API = "https://humanizer.diaiq.com/api/humanize";
const passes = Number(process.argv[2] || 1);
const minWords = Number(process.argv[3] || 3);
const delayMs = Number(process.argv[4] || 250);

const raw = fs.readFileSync(path, "utf8");
const parts = raw.split(/(?=^## )/m);
const preamble = parts[0];

const words = (s) => s.split(/\s+/).filter(Boolean).length;
const ph = (s) => (s.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join(",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalize(s) {
    return s
        .replace(/\bGoogle [Ss]preadsheets\b/g, "Google Sheets")
        .replace(/\bGoogle [Ss]preadsheet\b/g, "Google Sheet")
        .replace(/\bGoogle [Ss]heets\b/g, "Google Sheets")
        .replace(/\bGoogle [Ss]heet\b/g, "Google Sheet")
        .replace(/\bZippp\b/g, "zippp")
        .trim();
}

function reason(input, out) {
    if (!out) return "empty";
    if (out.startsWith("##")) return "structure";
    if (/\u2014/.test(out)) return "em-dash";
    if (ph(input) !== ph(out)) return "placeholder";
    if (/\bzippp\b/i.test(input) && !/\bzippp\b/i.test(out)) return "brand";
    const wi = words(input);
    const wo = words(out);
    if (wo < Math.floor(wi * 0.5) || wo > Math.ceil(wi * 2.2)) return "length";
    return null;
}

async function humanize(text) {
    for (let t = 0; t < 6; t++) {
        try {
            const res = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, passes }),
            });
            if (res.status === 429) {
                await sleep(1500 * (t + 1));
                continue;
            }
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            if (typeof data.text === "string") return data.text;
            throw new Error("no text");
        } catch {
            await sleep(1000 * (t + 1));
        }
    }
    return null;
}

const entries = [];
for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    const nl = p.indexOf("\n");
    const keyLine = p.slice(0, nl);
    const rest = p.slice(nl + 1);
    const value = rest.trim();
    const trailing = rest.slice(rest.trimEnd().length);
    entries.push({ keyLine, value, trailing });
}

let calls = 0;
let changed = 0;
let kept = 0;
const failed = [];

for (const e of entries) {
    const v = e.value;
    const skip = v === "" || /\n/.test(v) || words(v) < minWords || /^[#\-]/.test(v);
    if (skip) {
        kept++;
        continue;
    }
    calls++;
    let out = null;
    try {
        out = await humanize(v);
    } catch {
        out = null;
    }
    if (out) out = normalize(out);
    const why = out ? reason(v, out) : "request-failed";
    if (out && !why) {
        e.value = out;
        changed++;
    } else {
        if (why === "request-failed") failed.push(e.keyLine);
        kept++;
    }
    if (calls % 25 === 0) console.error(`  ${calls} calls, ${changed} changed`);
    await sleep(delayMs);
}

// A stray `# --- Revision 2 ---` marker is currently glued to this value.
for (const e of entries) {
    if (e.keyLine === "## app.check.datePlaceholder.id") {
        e.value = "dd/mm/yyyy";
    }
}

let outText = preamble;
for (const e of entries) {
    outText += `${e.keyLine}\n${e.value}${e.trailing}`;
}
fs.writeFileSync(path, outText);

console.error(`calls=${calls} changed=${changed} kept=${kept} failed=${failed.length}`);
if (failed.length) console.error("failed:\n" + failed.join("\n"));
