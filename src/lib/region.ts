/**
 * Region rules for zippp.
 *
 * Region is the single switch: it drives pricing currency and copy language.
 * Indonesia gets Indonesian and IDR; everyone else gets English (US) and
 * international pricing.
 */

export type Region = "id" | "intl";
export type Lang = "en" | "id";

export const REGION_COOKIE = "zippp_region";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export function langFromRegion(region: Region): Lang {
    return region === "id" ? "id" : "en";
}

export { COOKIE_MAX_AGE };
