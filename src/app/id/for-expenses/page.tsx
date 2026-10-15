import {
    personaMetadata,
    renderPersonaPage,
} from "@/lib/persona-page";

export const generateMetadata = personaMetadata("expenses");

export default function IdForExpensesPage() {
    return renderPersonaPage("expenses", "id");
}
