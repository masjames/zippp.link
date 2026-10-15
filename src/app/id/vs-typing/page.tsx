import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("typing");

export default function IdVsPage() {
    return renderCompetitorPage("typing", "id");
}
