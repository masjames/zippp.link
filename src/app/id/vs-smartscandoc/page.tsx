import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("smartscandoc");

export default function IdVsPage() {
    return renderCompetitorPage("smartscandoc", "id");
}
