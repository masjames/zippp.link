import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("scan2sheet");

export default function IdVsPage() {
    return renderCompetitorPage("scan2sheet", "id");
}
