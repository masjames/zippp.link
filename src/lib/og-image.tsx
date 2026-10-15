import { ImageResponse } from "next/og";
import type { Lang } from "./region";

export const OG_SIZE = { width: 1200, height: 630 };

const COPY = {
    en: {
        brand: "zippp",
        headline: "For people who still recap manually",
        body: "Snap the paper. Rows land in the Google Sheet you already use.",
        jobs: "Purchasing · Expenses · Sales · Reimbursement",
    },
    id: {
        brand: "zippp",
        headline: "Untuk yang masih merekap manual",
        body: "Jepret struknya. Barisnya masuk Google Sheet yang sudah kamu pakai.",
        jobs: "Pembelian · Pengeluaran · Penjualan · Reimbursement",
    },
} as const;

/** Shared OG / Twitter card art for zippp marketing pages. */
export function renderOgImage(lang: Lang) {
    const c = COPY[lang === "id" ? "id" : "en"];

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "64px 72px",
                    background: "linear-gradient(145deg, #f6d3c5 0%, #f3ede9 42%, #ffffff 100%)",
                    color: "#1c0b09",
                    fontFamily: "Arial, sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 16,
                            background: "#ee5329",
                            color: "#1c0b09",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 42,
                            fontWeight: 900,
                            letterSpacing: "-0.06em",
                        }}
                    >
                        z
                    </div>
                    <div
                        style={{
                            fontSize: 40,
                            fontWeight: 900,
                            letterSpacing: "-0.04em",
                            color: "#ee5329",
                        }}
                    >
                        {c.brand}
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div
                        style={{
                            fontSize: 64,
                            fontWeight: 900,
                            letterSpacing: "-0.045em",
                            lineHeight: 1.05,
                            maxWidth: 980,
                        }}
                    >
                        {c.headline}
                    </div>
                    <div
                        style={{
                            fontSize: 28,
                            fontWeight: 500,
                            color: "#5e4640",
                            maxWidth: 860,
                            lineHeight: 1.35,
                        }}
                    >
                        {c.body}
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        fontSize: 22,
                        fontWeight: 600,
                        color: "#3e0f0c",
                    }}
                >
                    <div>{c.jobs}</div>
                    <div style={{ color: "#ee5329" }}>zippp.link</div>
                </div>
            </div>
        ),
        { ...OG_SIZE }
    );
}
