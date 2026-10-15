import {
    personaMetadata,
    renderPersonaPage,
} from "@/lib/persona-page";

export const generateMetadata = personaMetadata("purchasing");

export default function IdForPurchasingPage() {
    return renderPersonaPage("purchasing", "id");
}
