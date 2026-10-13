import Landing from "@/components/landing/Landing";
import { businessInfo } from "@/lib/business";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";

/** International landing. Language follows the EN/ID selector. */
export default async function Home() {
    const wording = loadWording();
    const { lang } = await getLocale();
    return (
        <Landing
            wording={wording}
            lang={lang}
            region="intl"
            business={businessInfo()}
        />
    );
}
