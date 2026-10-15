import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("snaply");

export default function IdVsPage() {
    return renderCompetitorPage("snaply", "id");
}
