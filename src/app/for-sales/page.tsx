import {
    personaMetadata,
    renderPersonaPage,
} from "@/lib/persona-page";

export const generateMetadata = personaMetadata("sales");

export default function ForSalesPage() {
    return renderPersonaPage("sales", "intl");
}
