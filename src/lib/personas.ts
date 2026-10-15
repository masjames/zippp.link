import type { Region } from "./region";

/**
 * Use-case landing pages. Flat slugs: `/for-purchasing`, `/id/for-purchasing`.
 * Soft-launch personas are live for SEO/share; push ads only to ready ones.
 */
export type PersonaId =
    | "purchasing"
    | "expenses"
    | "sales"
    | "reimbursement";

export type PersonaDef = {
    id: PersonaId;
    /** Key under landing.who.* and landing.persona.<key>.* */
    whoKey: "resto" | "personal" | "sales" | "reimburse";
    /** Ads soft-launch: false = primary traffic; true = scaffold only for now */
    softLaunch: boolean;
    templateId:
        | "resto-inventory"
        | "personal-expense"
        | "sales-recap"
        | "reimbursement";
};

export const PERSONAS: PersonaDef[] = [
    {
        id: "purchasing",
        whoKey: "resto",
        softLaunch: false,
        templateId: "resto-inventory",
    },
    {
        id: "expenses",
        whoKey: "personal",
        softLaunch: false,
        templateId: "personal-expense",
    },
    {
        id: "sales",
        whoKey: "sales",
        softLaunch: false,
        templateId: "sales-recap",
    },
    {
        id: "reimbursement",
        whoKey: "reimburse",
        softLaunch: false,
        templateId: "reimbursement",
    },
];

/** Master card order: ID leads with purchasing; intl with expenses. */
export function personasForRegion(region: Region): PersonaDef[] {
    if (region === "id") {
        return [
            PERSONAS[0],
            PERSONAS[1],
            PERSONAS[2],
            PERSONAS[3],
        ];
    }
    return [
        PERSONAS[1],
        PERSONAS[3],
        PERSONAS[0],
        PERSONAS[2],
    ];
}

export function personaById(id: string): PersonaDef | null {
    return PERSONAS.find((p) => p.id === id) ?? null;
}

export function personaHref(id: PersonaId, region: Region): string {
    return region === "id" ? `/id/for-${id}` : `/for-${id}`;
}

export function masterHref(region: Region): string {
    return region === "id" ? "/id" : "/";
}
