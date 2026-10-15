import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("snaply");

export default function VsPage() {
    return renderCompetitorPage("snaply", "intl");
}
