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

// RFC 6749 §5.1's access token response (and, defensively, the error
// response) carries plaintext access/refresh tokens, so it must never be
// cached by a browser or intermediate proxy — same reasoning as
// oauth/register/route.ts's client_secret response.
const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };

function oauthError(error: string, status: number, description?: string) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: NO_STORE_HEADERS }
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

    // Validate every binding condition — including PKCE — on a read-only
    // lookup first. Marking the code used before this check would let a
    // request that merely holds a valid client_secret (but the wrong
    // code_verifier or redirect_uri) burn the code before the legitimate
    // client, with the correct verifier, ever gets to redeem it.
    const { data: codeRow } = await admin
      .from("oauth_authorization_codes")
      .select("client_id, redirect_uri, code_challenge, scope, user_id, expires_at, used")
      .eq("code", code)
      .maybeSingle();

    if (
      !codeRow ||
      codeRow.used ||
      codeRow.client_id !== client.id ||
      codeRow.redirect_uri !== redirectUri ||
      new Date(codeRow.expires_at).getTime() < Date.now() ||
      !verifyPkce(codeVerifier, codeRow.code_challenge)
    ) {
      return oauthError("invalid_grant", 400);
    }

    // Only claim (mark used) now that every check above passed. The
    // used=false condition here is what makes two concurrent requests that
    // both passed those checks (e.g. a duplicated retry) resolve to
    // exactly one winner — the loser gets 0 rows back and invalid_grant.
    const { data: redeemed } = await admin
      .from("oauth_authorization_codes")
      .update({ used: true })
      .eq("code", code)
      .eq("used", false)
      .select("user_id, scope")
      .maybeSingle();

    if (!redeemed) {
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

    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_token: refreshToken,
        scope: redeemed.scope,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  // grantType === "refresh_token"
  const { refresh_token: refreshToken } = body;
  if (!refreshToken) {
    return oauthError("invalid_request", 400);
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const nowIso = new Date().toISOString();

  // Rotate on every use: the WHERE clause here does validation (right
  // client, not already revoked, not expired) and claiming (the actual
  // revoke) in one atomic UPDATE, so two concurrent requests presenting the
  // same refresh token can't both read "still valid" and then both mint a
  // new token pair — only the one whose UPDATE actually matches a row (and
  // gets it back via .select()) wins; the other gets 0 rows back.
  const { data: claimed, error: claimError } = await admin
    .from("oauth_refresh_tokens")
    .update({ revoked_at: nowIso })
    .eq("token_hash", tokenHash)
    .eq("client_id", client.id)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .select("user_id, scope")
    .maybeSingle();

  if (claimError) {
    return oauthError("server_error", 500, claimError.message);
  }
  if (!claimed) {
    return oauthError("invalid_grant", 400);
  }

  const newRefreshToken = generateRefreshToken();

  const [accessToken, insertResult] = await Promise.all([
    signAccessToken(
      { clientId: client.id, userId: claimed.user_id, scope: claimed.scope },
      issuer
    ),
    admin.from("oauth_refresh_tokens").insert({
      token_hash: hashRefreshToken(newRefreshToken),
      client_id: client.id,
      user_id: claimed.user_id,
      scope: claimed.scope,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
    }),
  ]);

  // Promise.all doesn't surface a Supabase call's `{ error }` result as a
  // rejection — check it explicitly, or a failed insert here would silently
  // hand the caller a refresh_token that was never actually persisted.
  if (insertResult.error) {
    return oauthError("server_error", 500, insertResult.error.message);
  }

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: newRefreshToken,
      scope: claimed.scope,
    },
    { headers: NO_STORE_HEADERS }
  );
}
