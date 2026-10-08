import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { loadWording } from "@/lib/content";
import EvalClient from "./EvalClient";

export const dynamic = "force-dynamic";

export default async function AdminEvalPage() {
    const user = await currentUser();
    if (!user.admin) notFound();
    const wording = loadWording();
    return <EvalClient wording={wording} />;
}
