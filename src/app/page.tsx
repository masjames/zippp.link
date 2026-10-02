import Landing from "@/components/landing/Landing";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";

export default async function Home() {
    const { region, lang } = await getLocale();
    const wording = loadWording();

    return (
        <Landing wording={wording} initialLang={lang} region={region} />
    );
}
