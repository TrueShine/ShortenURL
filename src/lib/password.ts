import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(plain: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(plain: string, stored: string) {
  const [salt, derivedHex] = stored.split(":");
  if (!salt || !derivedHex) return false;

  const derived = scryptSync(plain, salt, KEY_LENGTH);
  const expected = Buffer.from(derivedHex, "hex");
  if (derived.length !== expected.length) return false;

  return timingSafeEqual(derived, expected);
}
