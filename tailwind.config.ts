import type { Config } from "tailwindcss";

/**
 * zippp design tokens, taken from the approved HTML prototype
 * (zippp-three-screens.html). Colour values live in globals.css as CSS
 * variables so light/dark theming works without duplicating values here.
 */
const config: Config = {
    content: ["./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: "var(--c-orange)",
                ink: "var(--c-ink)",
                maroon: "var(--c-maroon)",
                peach: "var(--c-peach)",
                mist: "var(--c-mist)",
                page: "var(--c-page)",
                card: "var(--c-bg)",
                surface: "var(--c-surface)",
                body: "var(--c-text)",
                muted: "var(--c-muted)",
                line: "var(--c-line)",
                btn: "var(--c-btn)",
                btntext: "var(--c-btn-text)",
                accent: "var(--c-accent-text)",
                danger: "var(--c-err)",
            },
            fontFamily: {
                head: [
                    "var(--font-head)",
                    "Archivo",
                    "Arial Narrow",
                    "Impact",
                    "sans-serif",
                ],
                body: [
                    "var(--font-body)",
                    "Inter",
                    "system-ui",
                    "-apple-system",
                    "Segoe UI",
                    "sans-serif",
                ],
            },
            borderRadius: {
                phone: "36px",
                panel: "28px",
                line: "22px",
            },
        },
    },
    plugins: [],
};

export default config;
