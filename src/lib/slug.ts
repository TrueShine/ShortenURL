import { customAlphabet } from "nanoid";

// Unambiguous alphanumeric alphabet (no 0/O/1/l/I) for readable short URLs.
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const generate = customAlphabet(alphabet, 7);

export const RESERVED_SLUGS = new Set([
  "api",
  "_admin",
  "_login",
  "g",
  "expired",
  "favicon.ico",
  "logo.png",
  "robots.txt",
  "sitemap.xml",
  "_next",
]);

const CUSTOM_ALIAS_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function generateRandomSlug() {
  return generate();
}

export function isValidCustomAlias(alias: string) {
  return CUSTOM_ALIAS_PATTERN.test(alias) && !RESERVED_SLUGS.has(alias);
}
