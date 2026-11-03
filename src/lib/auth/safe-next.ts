/**
 * Same-origin return path for post-login redirects. Rejects absolute URLs,
 * protocol-relative URLs, backslash tricks, and API routes.
 */
export function safeNextPath(
  value: string | null | undefined,
  baseUrl: string
): string | null {
  if (!value || value.length > 512) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;

  let resolved: URL;
  try {
    resolved = new URL(value, new URL(baseUrl));
  } catch {
    return null;
  }
  const base = new URL(baseUrl);
  if (resolved.origin !== base.origin) return null;
  if (resolved.pathname.startsWith("/api/")) return null;
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
