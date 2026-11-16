import type { CurrencyTotal } from "./legacy-summary";

/** Format integer minor units without converting a large amount to a floating-point number. */
export function formatCurrencyTotal(total: CurrencyTotal, locale: string): string {
    if (!/^(0|[1-9]\d*)$/.test(total.minor) || (total.currency !== "IDR" && total.currency !== "AUD")) {
        throw new Error("Invalid currency total");
    }
    const digits = total.currency === "AUD" ? 2 : 0;
    const units = BigInt(total.minor);
    const divisor = digits === 2 ? BigInt(100) : BigInt(1);
    const fraction = digits ? (units % divisor).toString().padStart(digits, "0") : "";
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: total.currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).formatToParts(units / divisor)
        .map((part) => part.type === "fraction" ? fraction : part.value)
        .join("");
}
