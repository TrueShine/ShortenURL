import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateClientSecret, hashClientSecret } from "@/lib/oauth/client-secret";
import { generateClientId, isValidRedirectUri } from "@/lib/oauth/client";

const MAX_CLIENT_ID_ATTEMPTS = 5;
const MAX_CLIENT_NAME_LENGTH = 200;
const MAX_REDIRECT_URIS = 10;

// No shared state exists to rate-limit against across invocations (see the
// statelessness note in api/mcp/route.ts — this app is serverless on
// Vercel), so abuse is bounded with a DB-backed check instead: an
// in-memory-per-instance counter would just reset on every cold start and
// miss most requests entirely.
const REGISTRATIONS_PER_WINDOW = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function registrationError(error: string, status: number, description?: string) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status }
  );
}

type RegisterBody = {
  client_name?: unknown;
  redirect_uris?: unknown;
};

// RFC 7591 Dynamic Client Registration. Intentionally unauthenticated —
// that's the spec'd behavior, and it only ever creates a client record.
// No token or code is issued here, so this can't be used to skip the
// admin login + consent step that /oauth/authorize still requires before
// any actual access is granted.
export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return registrationError("invalid_client_metadata", 400, "잘못된 요청 본문입니다.");
  }

  const clientName = typeof body.client_name === "string" ? body.client_name.trim() : "";
  if (!clientName || clientName.length > MAX_CLIENT_NAME_LENGTH) {
    return registrationError(
      "invalid_client_metadata",
      400,
      "client_name이 필요합니다 (최대 200자)."
    );
  }

  const redirectUris = body.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    redirectUris.length > MAX_REDIRECT_URIS ||
    !redirectUris.every(isValidRedirectUri)
  ) {
    return registrationError(
      "invalid_redirect_uri",
      400,
      "유효한 redirect_uris(http/https)를 1개 이상 10개 이하로 입력해주세요."
    );
  }

  const admin = createAdminClient();

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentCount, error: countError } = await admin
    .from("oauth_clients")
    .select("id", { count: "exact", head: true })
    .is("created_by", null)
    .gte("created_at", windowStart);

  if (countError) {
    return registrationError("server_error", 500, countError.message);
  }
  if ((recentCount ?? 0) >= REGISTRATIONS_PER_WINDOW) {
    return registrationError(
      "invalid_client_metadata",
      429,
      "잠시 후 다시 시도해주세요."
    );
  }

  const clientSecret = generateClientSecret();
  const clientSecretHash = hashClientSecret(clientSecret);

  for (let attempt = 0; attempt < MAX_CLIENT_ID_ATTEMPTS; attempt++) {
    const clientId = generateClientId();
    const { data, error } = await admin
      .from("oauth_clients")
      .insert({
        name: clientName,
        client_id: clientId,
        client_secret_hash: clientSecretHash,
        redirect_uris: redirectUris,
        // Dynamically-registered clients have no admin actor behind the
        // request, unlike the manual /_admin route which stamps the
        // logged-in admin's id — created_by stays null (nullable column,
        // see 0006_mcp_oauth.sql).
        created_by: null,
      })
      .select("client_id, redirect_uris, created_at")
      .single();

    if (!error) {
      return NextResponse.json(
        {
          client_id: data.client_id,
          client_secret: clientSecret,
          client_id_issued_at: Math.floor(new Date(data.created_at).getTime() / 1000),
          client_secret_expires_at: 0,
          client_name: clientName,
          redirect_uris: data.redirect_uris,
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "client_secret_post",
        },
        { status: 201 }
      );
    }

    if (error.code !== "23505") {
      return registrationError("server_error", 500, error.message);
    }
    // 23505 = unique violation on client_id; regenerate and retry.
  }

  return registrationError("server_error", 500, "클라이언트 등록에 실패했습니다. 다시 시도해주세요.");
}
