/**
 * Public business details shown on the pricing, terms, privacy, refund and
 * contact pages. Payment gateways review these pages, so the values must be
 * real. Server-only env; never NEXT_PUBLIC_.
 */
export type BusinessInfo = {
    name: string;
    email: string;
    whatsapp: string;
    address: string;
    /** Legal entity or person operating the service, e.g. the DOKU merchant. */
    operator: string;
};

export function businessInfo(): BusinessInfo {
    return {
        name: process.env.BUSINESS_NAME || "zippp",
        email: process.env.CONTACT_EMAIL || "asilverspoong@gmail.com",
        whatsapp: process.env.CONTACT_WA || "",
        address: process.env.BUSINESS_ADDRESS || "",
        operator: process.env.BUSINESS_OPERATOR || "Aldan Arkara",
    };
}

/** `62812...` -> `https://wa.me/62812...`; empty when not configured. */
export function whatsappLink(number: string): string {
    const digits = number.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : "";
}
