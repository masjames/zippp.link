import type { Region } from "./region";

/**
 * Comparison pages (PhotoAI-style footer SEO). Flat slugs: `/vs-sheetify`,
 * `/id/vs-sheetify`. Fair, specific claims; no invented competitor metrics.
 */
export type CompetitorId =
    | "snaply"
    | "sheetify"
    | "scan2sheet"
    | "expensify"
    | "smartscandoc"
    | "typing";

export type CompetitorDef = {
    id: CompetitorId;
    /** Display name on the page */
    name: string;
    /** Short label in footer */
    shortName: string;
};

export const COMPETITORS: CompetitorDef[] = [
    { id: "snaply", name: "Snaply", shortName: "Snaply" },
    { id: "sheetify", name: "Sheetify", shortName: "Sheetify" },
    { id: "scan2sheet", name: "Scan2Sheet", shortName: "Scan2Sheet" },
    { id: "expensify", name: "Expensify", shortName: "Expensify" },
    { id: "smartscandoc", name: "SmartScan Doc", shortName: "SmartScan" },
    { id: "typing", name: "typing into Sheets", shortName: "Typing" },
];

export function competitorById(id: string): CompetitorDef | null {
    return COMPETITORS.find((c) => c.id === id) ?? null;
}

export function competitorHref(id: CompetitorId, region: Region): string {
    return region === "id" ? `/id/vs-${id}` : `/vs-${id}`;
}

/** Comparison rows: feature key → shown in wording as landing.vs.row.<key> */
export const VS_ROW_KEYS = [
    "destination",
    "lineItems",
    "checkStep",
    "indonesia",
    "pricing",
    "photoProof",
    "lockIn",
] as const;

export type VsRowKey = (typeof VS_ROW_KEYS)[number];
