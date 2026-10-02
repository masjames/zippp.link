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

/** Read the visitor's region and language from cookies (server components). */
export async function getLocale(): Promise<Locale> {
    const store = await cookies();
    const region: Region =
        store.get(REGION_COOKIE)?.value === "id" ? "id" : "intl";
    const lang = normalizeLang(store.get(LANG_COOKIE)?.value) ?? langFromRegion(region);
    return { region, lang };
}
