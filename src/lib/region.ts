/**
 * Region and language rules for zippp.
 *
 * Region drives pricing currency; language drives copy. Indonesia gets
 * Indonesian copy and IDR pricing; everyone else gets English (US) and
 * international pricing. The user can still override language with the
 * toggle, but pricing follows the region, not the toggle.
 */

export type Region = "id" | "intl";
export type Lang = "en" | "id";

export const REGION_COOKIE = "zippp_region";
export const LANG_COOKIE = "zippp_lang";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export function regionFromCountry(country: string | null | undefined): Region {
    return country?.trim().toUpperCase() === "ID" ? "id" : "intl";
}

export function langFromRegion(region: Region): Lang {
    return region === "id" ? "id" : "en";
}

export function normalizeLang(value: string | null | undefined): Lang | null {
    return value === "id" ? "id" : value === "en" ? "en" : null;
}

/** Cheap Accept-Language check used only when no country header exists (local dev). */
export function regionFromAcceptLanguage(header: string | null): Region {
    if (!header) return "intl";
    const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
    return first.startsWith("id") ? "id" : "intl";
}

export { COOKIE_MAX_AGE };
