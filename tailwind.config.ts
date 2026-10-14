import type { Config } from "tailwindcss";

/**
 * zippp design tokens, taken from the approved HTML prototype
 * (zippp-three-screens.html). Colour values live in globals.css as CSS
 * variables. Light theme only.
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
            // Half the default scale, so the UI reads less bubbly. `full` is
            // kept for pills.
            borderRadius: {
                none: "0px",
                sm: "0.0625rem",
                DEFAULT: "0.125rem",
                md: "0.1875rem",
                lg: "0.25rem",
                xl: "0.375rem",
                "2xl": "0.5rem",
                "3xl": "0.75rem",
                full: "9999px",
                phone: "18px",
                panel: "14px",
                line: "11px",
            },
        },
    },
    plugins: [],
};

export default config;
