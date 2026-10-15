import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("typing");

export default function VsPage() {
    return renderCompetitorPage("typing", "intl");
}
