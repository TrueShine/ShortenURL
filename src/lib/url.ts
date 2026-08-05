/**
 * Normalizes a user-entered target URL: adds an https:// scheme when the
 * input has none (e.g. "example.com" -> "https://example.com/"), then
 * validates it's a well-formed http(s) URL. Returns null when invalid.
 */
export function normalizeTargetUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
