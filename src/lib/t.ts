/**
 * Wording lookup. Every user-visible string lives in zippp-wording.md under a
 * flat `key.lang` name (e.g. `landing.hero.cta.en`). This helper is safe on the
 * client; the markdown is loaded once on the server (see content.ts).
 */

export type Wording = Record<string, string>;

export type T = (key: string, fallback?: string) => string;

/** Build a translator bound to one language, falling back to English. */
export function makeT(wording: Wording, lang: string): T {
    return (key: string, fallback = key) =>
        wording[`${key}.${lang}`] ?? wording[`${key}.en`] ?? fallback;
}

/** Replace {placeholders} in a template. */
export function fill(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, name: string) =>
        name in values ? String(values[name]) : `{${name}}`
    );
}
