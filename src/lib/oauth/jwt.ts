import { SignJWT, jwtVerify } from "jose";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1시간
const AUTHORIZATION_CODE_TTL_MS = 60 * 1000; // 60초
const MCP_SCOPE = "mcp:links";

export type AccessTokenClaims = {
  clientId: string;
  userId: string;
  scope: string;
};

function getJwtSecret() {
  const secret = process.env.MCP_OAUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("MCP_OAUTH_JWT_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return new TextEncoder().encode(secret);
}

// Shared by every OAuth/MCP route that needs an absolute URL (issuer,
// well-known metadata, authorization/token endpoints) — all must agree on
// the same origin string or token validation between them breaks.
export function getIssuer(requestUrl: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) return new URL(requestUrl).origin;
  return /^https?:\/\//i.test(configured)
    ? configured.replace(/\/$/, "")
    : `https://${configured.replace(/\/$/, "")}`;
}

export async function signAccessToken(
  claims: AccessTokenClaims,
  issuer: string
) {
  return new SignJWT({ client_id: claims.clientId, scope: claims.scope })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

export { ACCESS_TOKEN_TTL_SECONDS, AUTHORIZATION_CODE_TTL_MS, MCP_SCOPE };

// Verifies signature, expiry, and issuer. Never throws — every caller
// (the MCP resource server on every request) treats any failure the same
// way: reject with 401, not a 500 from an uncaught JWT error.
export async function verifyAccessToken(
  token: string,
  issuer: string
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer });
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.client_id !== "string") return null;
    if (typeof payload.scope !== "string") return null;
    return { userId: payload.sub, clientId: payload.client_id, scope: payload.scope };
  } catch {
    return null;
  }
}
