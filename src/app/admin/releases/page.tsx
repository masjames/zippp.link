import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { loadWording } from "@/lib/content";
import ReleasesClient from "./ReleasesClient";

export const dynamic = "force-dynamic";

export default async function AdminReleasesPage() {
    const user = await currentUser();
    if (!user.admin) notFound();
    const wording = loadWording();
    return <ReleasesClient wording={wording} />;
}
