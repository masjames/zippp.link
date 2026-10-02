import { readFileSync } from "fs";
import path from "path";
import type { Wording } from "./t";

/**
 * Parse zippp-wording.md — the single source of truth for all copy.
 *
 * Format, per entry:
 *
 *   ## some.key.en
 *   The English words.
 *
 *   ## some.key.id
 *   Kata-katanya dalam Bahasa Indonesia.
 *
 * A value runs until the next `## ` line and may span multiple lines. The
 * file is read once and cached for the life of the process. Server-only.
 */
let cache: Wording | null = null;

export function loadWording(): Wording {
    if (cache) return cache;

    const file = path.join(process.cwd(), "zippp-wording.md");
    const raw = readFileSync(file, "utf8");
    const map: Wording = {};

    for (const block of raw.split(/^## /m).slice(1)) {
        const newline = block.indexOf("\n");
        if (newline === -1) continue;
        const key = block.slice(0, newline).trim();
        if (!key) continue;
        map[key] = block.slice(newline + 1).trim();
    }

    if (Object.keys(map).length === 0) {
        throw new Error(
            "zippp-wording.md parsed to zero entries — check the ## key format."
        );
    }

    cache = map;
    return map;
}
