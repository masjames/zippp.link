import {
    personaMetadata,
    renderPersonaPage,
} from "@/lib/persona-page";

export const generateMetadata = personaMetadata("expenses");

export default function ForExpensesPage() {
    return renderPersonaPage("expenses", "intl");
}
