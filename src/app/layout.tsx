import type { Metadata } from "next";
import type { ReactNode } from "react";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";
import { makeT } from "@/lib/t";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
    const { lang } = await getLocale();
    const t = makeT(loadWording(), lang);
    const title = t("meta.title");
    const description = t("meta.description");
    return {
        metadataBase: new URL("https://www.zippp.link"),
        title,
        description,
        openGraph: {
            title,
            description,
            url: "https://www.zippp.link",
            type: "website",
            images: [
                {
                    url: "/og.png",
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: ["/og.png"],
        },
    };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
    const { lang } = await getLocale();

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
            <body className="font-body">{children}</body>
        </html>
    );
}
