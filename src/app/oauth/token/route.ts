import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyClientSecret } from "@/lib/oauth/client-secret";
import { verifyPkce } from "@/lib/oauth/pkce";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  getIssuer,
  signAccessToken,
} from "@/lib/oauth/jwt";

const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function oauthError(error: string, status: number, description?: string) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status }
  );
}

// Opaque high-entropy refresh tokens don't need scrypt's slow-hash
// resistance the way client_secret (typed by a human) does — a plain
// SHA-256 digest is the standard way to make an unguessable bearer token
// safely indexable/comparable in storage.
function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken() {
  return randomBytes(32).toString("base64url");
}

async function readBody(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    return Object.fromEntries(new URLSearchParams(text));
  }

  // Spec'd as a JSON API, but real OAuth/MCP clients conventionally POST
  // form-encoded per RFC 6749 — accept both rather than rejecting a
  // standards-compliant client.
  try {
    const json = await request.json();
    if (json && typeof json === "object") {
      return Object.fromEntries(
        Object.entries(json as Record<string, unknown>).map(([k, v]) => [k, String(v)])
      );
    }
  } catch {
    // fall through
  }
  return {};
}

function extractClientCredentials(
  request: Request,
  body: Record<string, string>
): { clientId: string; clientSecret: string } | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    let decoded: string;
    try {
      decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    } catch {
      return null;
    }
    const sep = decoded.indexOf(":");
    if (sep === -1) return null;
    return {
      clientId: decodeURIComponent(decoded.slice(0, sep)),
      clientSecret: decodeURIComponent(decoded.slice(sep + 1)),
    };
  }

  if (body.client_id && body.client_secret) {
    return { clientId: body.client_id, clientSecret: body.client_secret };
  }

  return null;
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const grantType = body.grant_type;

  if (grantType !== "authorization_code" && grantType !== "refresh_token") {
    return oauthError("unsupported_grant_type", 400);
  }

  const credentials = extractClientCredentials(request, body);
  if (!credentials) {
    return oauthError("invalid_client", 401, "클라이언트 인증 정보가 없습니다.");
  }

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("oauth_clients")
    .select("id, client_secret_hash, revoked_at")
    .eq("client_id", credentials.clientId)
    .maybeSingle();

  if (
    !client ||
    client.revoked_at ||
    !verifyClientSecret(credentials.clientSecret, client.client_secret_hash)
  ) {
    return oauthError("invalid_client", 401);
  }

  const issuer = getIssuer(request.url);

  if (grantType === "authorization_code") {
    const { code, redirect_uri: redirectUri, code_verifier: codeVerifier } = body;
    if (!code || !redirectUri || !codeVerifier) {
      return oauthError("invalid_request", 400);
    }

    // Single-use: the update below only succeeds while used=false, so a
    // concurrent or repeated redemption of the same code loses the race
    // and gets invalid_grant instead of a second valid token pair.
    const { data: redeemed } = await admin
      .from("oauth_authorization_codes")
      .update({ used: true })
      .eq("code", code)
      .eq("used", false)
      .select("client_id, redirect_uri, code_challenge, scope, user_id, expires_at")
      .maybeSingle();

    if (
      !redeemed ||
      redeemed.client_id !== client.id ||
      redeemed.redirect_uri !== redirectUri ||
      new Date(redeemed.expires_at).getTime() < Date.now() ||
      !verifyPkce(codeVerifier, redeemed.code_challenge)
    ) {
      return oauthError("invalid_grant", 400);
    }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(
        { clientId: client.id, userId: redeemed.user_id, scope: redeemed.scope },
        issuer
      ),
      Promise.resolve(generateRefreshToken()),
    ]);

    const { error: insertError } = await admin.from("oauth_refresh_tokens").insert({
      token_hash: hashRefreshToken(refreshToken),
      client_id: client.id,
      user_id: redeemed.user_id,
      scope: redeemed.scope,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
    });

    if (insertError) {
      return oauthError("server_error", 500, insertError.message);
    }

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope: redeemed.scope,
    });
  }

  // grantType === "refresh_token"
  const { refresh_token: refreshToken } = body;
  if (!refreshToken) {
    return oauthError("invalid_request", 400);
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const { data: existing } = await admin
    .from("oauth_refresh_tokens")
    .select("client_id, user_id, scope, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (
    !existing ||
    existing.revoked_at ||
    existing.client_id !== client.id ||
    new Date(existing.expires_at).getTime() < Date.now()
  ) {
    return oauthError("invalid_grant", 400);
  }

  // Rotate on every use: revoke the presented refresh token and issue a
  // fresh one, so a leaked-but-unused-yet token stops working the moment
  // the legitimate client refreshes, instead of staying valid for 90 days.
  const newRefreshToken = generateRefreshToken();

  const { error: revokeError } = await admin
    .from("oauth_refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("revoked_at", null);

  if (revokeError) {
    return oauthError("server_error", 500, revokeError.message);
  }

  const [accessToken, insertResult] = await Promise.all([
    signAccessToken(
      { clientId: client.id, userId: existing.user_id, scope: existing.scope },
      issuer
    ),
    admin.from("oauth_refresh_tokens").insert({
      token_hash: hashRefreshToken(newRefreshToken),
      client_id: client.id,
      user_id: existing.user_id,
      scope: existing.scope,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
    }),
  ]);

  // Promise.all doesn't surface a Supabase call's `{ error }` result as a
  // rejection — check it explicitly, or a failed insert here would silently
  // hand the caller a refresh_token that was never actually persisted.
  if (insertResult.error) {
    return oauthError("server_error", 500, insertResult.error.message);
  }

  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: newRefreshToken,
    scope: existing.scope,
  });
}
