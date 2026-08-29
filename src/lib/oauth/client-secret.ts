import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/password";

// OAuth client_secret values are opaque high-entropy tokens, not
// user-chosen passwords, but they share password.ts's scrypt hash storage
// format (salt:hash) since "hash before storing, compare with
// timingSafeEqual" is the same property needed here.
export function generateClientSecret() {
  return randomBytes(32).toString("base64url");
}

export const hashClientSecret = hashPassword;
export const verifyClientSecret = verifyPassword;
