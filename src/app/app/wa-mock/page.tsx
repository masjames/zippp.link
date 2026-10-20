import { redirect } from "next/navigation";
import WaMockClient from "@/components/app/WaMockClient";
import { waMockMode } from "@/lib/wa/config";

export default function WaMockPage() {
    if (!waMockMode()) {
        redirect("/app/settings");
    }
    return <WaMockClient />;
}
