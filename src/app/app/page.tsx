import AppFlow from "@/components/app/AppFlow";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";

export default async function AppPage() {
    const { region, lang } = await getLocale();
    const wording = loadWording();

    return <AppFlow wording={wording} initialLang={lang} region={region} />;
}
