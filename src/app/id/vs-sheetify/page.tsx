import {
    competitorMetadata,
    renderCompetitorPage,
} from "@/lib/competitor-page";

export const generateMetadata = competitorMetadata("sheetify");

export default function IdVsPage() {
    return renderCompetitorPage("sheetify", "id");
}
