import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { loadWording } from "@/lib/content";
import ContributionsClient from "./ContributionsClient";

export const dynamic = "force-dynamic";

export default async function AdminContributionsPage() {
    const user = await currentUser();
    if (!user.admin) notFound();
    const wording = loadWording();
    return <ContributionsClient wording={wording} />;
}
