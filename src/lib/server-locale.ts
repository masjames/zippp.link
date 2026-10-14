import { cookies } from "next/headers";
import {
    LANG_COOKIE,
    REGION_COOKIE,
    langFromRegion,
    normalizeLang,
    type Lang,
    type Region,
} from "./region";

export type Locale = { region: Region; lang: Lang };

function regionFromStore(value: string | undefined): Region {
    return value === "id" ? "id" : "intl";
}

/** Public pages: region drives currency and language. */
export async function getLocale(): Promise<Locale> {
    const store = await cookies();
    const region = regionFromStore(store.get(REGION_COOKIE)?.value);
    return { region, lang: langFromRegion(region) };
}

/**
 * App pages: region still drives currency, but the app language setting
 * (`LANG_COOKIE`) overrides the copy.
 */
export async function getAppLocale(): Promise<Locale> {
    const store = await cookies();
    const region = regionFromStore(store.get(REGION_COOKIE)?.value);
    const override = normalizeLang(store.get(LANG_COOKIE)?.value);
    return { region, lang: override ?? langFromRegion(region) };
}
