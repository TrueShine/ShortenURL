import { randomBytes } from "node:crypto";

// Shared by both the admin manual-registration route and the RFC 7591
// dynamic registration route so client_id shape and redirect_uri
// validation can't drift between the two entry points.

export function generateClientId() {
  return `mcp_${randomBytes(16).toString("base64url")}`;
}

export function isValidRedirectUri(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
