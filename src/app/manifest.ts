import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "zippp",
        short_name: "zippp",
        description:
            "For people who still type receipts. Photograph the paper; rows land in your Google Sheet.",
        start_url: "/",
        display: "standalone",
        background_color: "#f3ede9",
        theme_color: "#ee5329",
        icons: [
            {
                src: "/favicon.svg",
                sizes: "any",
                type: "image/svg+xml",
                purpose: "any",
            },
        ],
    };
}
