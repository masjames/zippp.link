import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { loadWording } from "@/lib/content";
import { ensureDonationTokenFromSession } from "@/lib/google/donation-token";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const user = await currentUser();
    if (!user.admin) notFound();
    // Keep the donation Drive credential in sync with the admin session.
    try {
        await ensureDonationTokenFromSession();
    } catch {
        /* ignore */
    }
    const wording = loadWording();
    return <AdminClient wording={wording} />;
}
