import type { Metadata } from "next";
import type { ReactNode } from "react";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";
import { makeT } from "@/lib/t";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://www.zippp.link"),
    title: "zippp — receipts in, rows out",
    description:
        "Photograph a receipt or invoice, check what zippp read, and send the rows to your Google Sheet.",
    openGraph: {
        title: "zippp — receipts in, rows out",
        description:
            "Photograph a receipt or invoice, check what zippp read, and send the rows to your Google Sheet.",
        url: "https://www.zippp.link",
        type: "website",
        images: [
            {
                url: "/og.png",
                width: 1200,
                height: 630,
                alt: "zippp — receipts in, rows out",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "zippp — receipts in, rows out",
        description:
            "Photograph a receipt or invoice, check what zippp read, and send the rows to your Google Sheet.",
        images: ["/og.png"],
    },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
    const { lang } = await getLocale();
    const wording = loadWording();
    const t = makeT(wording, lang);

    return (
        <html lang={lang === "id" ? "id" : "en"}>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="font-body">
                {/* Title comes from here so the wording file also drives <title>. */}
                <title>{t("meta.title")}</title>
                <meta name="description" content={t("meta.description")} />
                {children}
            </body>
        </html>
    );
}
