/** Canonical production origin. Always www. */
export const SITE_URL = "https://www.zippp.link";

export function absoluteUrl(path: string): string {
    if (!path || path === "/") return `${SITE_URL}/`;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${SITE_URL}${p}`;
}
