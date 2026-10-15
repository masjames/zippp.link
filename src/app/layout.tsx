import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";
import { SITE_URL } from "@/lib/site";
import { makeT } from "@/lib/t";
import "./globals.css";

export const viewport: Viewport = {
    themeColor: "#ee5329",
    width: "device-width",
    initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
    const { lang } = await getLocale();
    const t = makeT(loadWording(), lang);
    const title = t("meta.title");
    const description = t("meta.description");
    return {
        metadataBase: new URL(SITE_URL),
        title: {
            default: title,
            template: "%s · zippp",
        },
        description,
        applicationName: "zippp",
        authors: [{ name: "Aldan Arkara", url: SITE_URL }],
        creator: "Aldan Arkara",
        publisher: "zippp",
        icons: {
            icon: [
                { url: "/favicon.svg", type: "image/svg+xml" },
                { url: "/icon", type: "image/png" },
            ],
            apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
        },
        openGraph: {
            title,
            description,
            url: SITE_URL,
            siteName: "zippp",
            type: "website",
            images: [
                {
                    url: "/opengraph-image",
                    width: 1200,
                    height: 630,
                    alt:
                        lang === "id"
                            ? "zippp — Untuk yang masih mengetik nota"
                            : "zippp — For people who still type receipts",
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: ["/opengraph-image"],
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-image-preview": "large",
                "max-snippet": -1,
                "max-video-preview": -1,
            },
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
