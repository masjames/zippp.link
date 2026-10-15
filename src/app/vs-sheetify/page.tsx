import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("sheetify");

export default function VsPage() {
    return renderCompetitorPage("sheetify", "intl");
}
