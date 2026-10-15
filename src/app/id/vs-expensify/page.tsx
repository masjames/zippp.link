import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("expensify");

export default function IdVsPage() {
    return renderCompetitorPage("expensify", "id");
}
