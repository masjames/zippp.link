import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "zippp",
        short_name: "zippp",
        description:
            "Photograph a receipt, check the read, send rows to your Google Sheet.",
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
