import {
    personaMetadata,
    renderPersonaPage,
} from "@/lib/persona-page";

export const generateMetadata = personaMetadata("reimbursement");

export default function ForReimbursementPage() {
    return renderPersonaPage("reimbursement", "intl");
}
