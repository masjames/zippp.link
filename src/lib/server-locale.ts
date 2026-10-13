import { cookies } from "next/headers";
import {
    LANG_COOKIE,
    langFromRegion,
    normalizeLang,
    REGION_COOKIE,
    type Lang,
    type Region,
} from "./region";

export type Locale = { region: Region; lang: Lang };

/**
 * Region comes from the cookie the middleware set at entry; language follows
 * the region unless the user picked one with the EN/ID language selector
 * (`LANG_COOKIE`).
 */
export async function getLocale(): Promise<Locale> {
    const store = await cookies();
    const region: Region =
        store.get(REGION_COOKIE)?.value === "id" ? "id" : "intl";
    const override = normalizeLang(store.get(LANG_COOKIE)?.value);
    return { region, lang: override ?? langFromRegion(region) };
}
