import Landing from "@/components/landing/Landing";
import { businessInfo } from "@/lib/business";
import { loadWording } from "@/lib/content";
import { landingAssets } from "@/lib/landing-assets";
import { getLocale } from "@/lib/server-locale";

/** Indonesian landing. Language follows the language selector. */
export default async function IdHome() {
    const wording = loadWording();
    const { region, lang } = await getLocale();
    return (
        <Landing
            wording={wording}
            lang={lang}
            region={region}
            business={businessInfo()}
            assets={landingAssets(lang)}
        />
    );
}
