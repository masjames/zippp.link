import Landing from "@/components/landing/Landing";
import { loadWording } from "@/lib/content";

/** Indonesian landing. */
export default function IdHome() {
    const wording = loadWording();
    return <Landing wording={wording} lang="id" region="id" />;
}
