import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { loadWording } from "@/lib/content";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const user = await currentUser();
    if (!user.admin) notFound();
    const wording = loadWording();
    return <AdminClient wording={wording} />;
}
