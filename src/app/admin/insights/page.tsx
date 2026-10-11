import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { loadWording } from "@/lib/content";
import InsightsClient from "./InsightsClient";

export const dynamic = "force-dynamic";

export default async function AdminInsightsPage() {
    const user = await currentUser();
    if (!user.admin) notFound();
    const wording = loadWording();
    return <InsightsClient wording={wording} />;
}
