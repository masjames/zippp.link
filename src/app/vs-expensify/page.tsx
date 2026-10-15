import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("expensify");

export default function VsPage() {
    return renderCompetitorPage("expensify", "intl");
}
