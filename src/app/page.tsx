import Landing from "@/components/landing/Landing";
import { loadWording } from "@/lib/content";

/** English (international) landing. */
export default function Home() {
    const wording = loadWording();
    return <Landing wording={wording} lang="en" region="intl" />;
}
