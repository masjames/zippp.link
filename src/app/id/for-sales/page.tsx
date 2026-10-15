import {
    personaMetadata,
    renderPersonaPage,
} from "@/lib/persona-page";

export const generateMetadata = personaMetadata("sales");

export default function IdForSalesPage() {
    return renderPersonaPage("sales", "id");
}
