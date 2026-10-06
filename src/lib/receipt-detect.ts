/**
 * Is this OCR text a receipt or invoice?
 *
 * Cheap, deterministic heuristic over the PaddleOCR output, used to gate
 * auto-capture so it only fires when a receipt is actually in frame. Kept
 * conservative: needs several money-like numbers plus a date or a receipt
 * keyword.
 */
export function isLikelyReceipt(text: string): boolean {
    const s = text.trim();
    if (s.length < 20) return false;

    const tokens = s.split(/[\s\n|]+/).filter(Boolean);
    if (tokens.length < 5) return false;

    const money = tokens.filter(
        (t) => /\d{3,}/.test(t) || /\d+[.,]\d{3}/.test(t)
    ).length;

    const hasDate = /\b\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}\b/.test(s);
    const hasKeyword =
        /total|subtotal|jumlah|tunai|bayar|kembali|ppn|pajak|tax|harga|qty|item|nota|invoice|receipt|kasir|struk|supplier|merchant/i.test(
            s
        );

    // Lenient on purpose: auto-capture would rather verify a torn, low-light
    // receipt than miss it. The extraction essentials (date/item/price) still
    // gate what reaches the sheet.
    return money >= 1 && (hasDate || hasKeyword);
}
