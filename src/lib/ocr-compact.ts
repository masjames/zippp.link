/**
 * Compact PaddleOCR markdown before it goes to DeepSeek.
 *
 * PaddleOCR-VL emits tables as verbose HTML
 * (`<td style='text-align: center; word-wrap: break-word;'>…`) which costs
 * thousands of tokens per receipt. We convert those tables to markdown pipe
 * tables and strip the remaining tags, keeping the same information in far
 * fewer tokens.
 */

const MAX_OCR_CHARS = 20_000;

function stripTags(value: string): string {
    return value.replace(/<[^>]+>/g, " ");
}

function tableToMarkdown(block: string): string {
    const rows: string[][] = [];
    for (const tr of block.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
        const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
            (m) => stripTags(m[1]).replace(/\s+/g, " ").trim()
        );
        if (cells.length) rows.push(cells);
    }
    if (rows.length === 0) return "";

    const sep = `| ${rows[0].map(() => "---").join(" | ")} |`;
    const body = rows.slice(1).map((r) => `| ${r.join(" | ")} |`);
    return `\n${`| ${rows[0].join(" | ")} |`}\n${sep}\n${body.join("\n")}\n`;
}

export function compactOcrMarkdown(markdown: string): string {
    let out = markdown.replace(/<table[\s\S]*?<\/table>/gi, (block) =>
        tableToMarkdown(block)
    );
    out = stripTags(out);
    out = out
        .replace(/[ \t]+\n/g, "\n")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    return out.length > MAX_OCR_CHARS ? out.slice(0, MAX_OCR_CHARS) : out;
}
