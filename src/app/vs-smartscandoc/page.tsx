import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("smartscandoc");

export default function VsPage() {
    return renderCompetitorPage("smartscandoc", "intl");
}
