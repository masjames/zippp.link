import {
    personaMetadata,
    renderPersonaPage,
} from "@/lib/persona-page";

export const generateMetadata = personaMetadata("reimbursement");

export default function IdForReimbursementPage() {
    return renderPersonaPage("reimbursement", "id");
}
