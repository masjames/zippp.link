/**
 * Region and language rules for zippp.
 *
 * Region is the public switch: it drives pricing currency and copy language on
 * the landing and the public pages. The app has its own language setting
 * (`LANG_COOKIE`) that changes copy only, never the currency.
 */

export type Region = "id" | "intl";
export type Lang = "en" | "id";

export const REGION_COOKIE = "zippp_region";
export const LANG_COOKIE = "zippp_lang";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export function langFromRegion(region: Region): Lang {
    return region === "id" ? "id" : "en";
}

export function normalizeLang(value: string | null | undefined): Lang | null {
    return value === "id" ? "id" : value === "en" ? "en" : null;
}

export { COOKIE_MAX_AGE };
