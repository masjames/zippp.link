import { cookies } from "next/headers";
import {
    REGION_COOKIE,
    langFromRegion,
    type Lang,
    type Region,
} from "./region";

export type Locale = { region: Region; lang: Lang };

/**
 * Region comes from the cookie the middleware set at entry. Language follows
 * the region (`id` -> Indonesian, otherwise English); the toggle is gone.
 */
export async function getLocale(): Promise<Locale> {
    const store = await cookies();
    const region: Region =
        store.get(REGION_COOKIE)?.value === "id" ? "id" : "intl";
    return { region, lang: langFromRegion(region) };
}
