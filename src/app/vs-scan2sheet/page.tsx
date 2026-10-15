import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("scan2sheet");

export default function VsPage() {
    return renderCompetitorPage("scan2sheet", "intl");
}
