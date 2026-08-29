import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateClientSecret, hashClientSecret } from "@/lib/oauth/client-secret";
import { generateClientId, isValidRedirectUri } from "@/lib/oauth/client";

const MAX_CLIENT_ID_ATTEMPTS = 5;
const MAX_CLIENT_NAME_LENGTH = 200;
const MAX_REDIRECT_URIS = 10;

// RFC 7591 §3.2.1's client information response carries a plaintext
// client_secret and is explicitly specced with these headers so it never
// gets cached by a browser or intermediate proxy.
const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };

function registrationError(error: string, status: number, description?: string) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: NO_STORE_HEADERS }
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
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return registrationError("invalid_client_metadata", 400, "잘못된 요청 본문입니다.");
  }

  // request.json() happily returns null/an array/a primitive for bodies
  // like "null" or "[]" — reject anything that isn't a plain object before
  // touching its properties, since this route (unlike the admin-only
  // mcp-clients route) is open to unauthenticated callers.
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return registrationError("invalid_client_metadata", 400, "잘못된 요청 본문입니다.");
  }
  const body = parsed as RegisterBody;

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

  // A count-then-insert throttle here would race under concurrent requests
  // (every request can read "under the limit" before any of them commits
  // its insert) without a shared, atomic counter this app has no infra
  // for — see api/mcp/route.ts's statelessness note. Abuse resistance for
  // this unauthenticated endpoint rests on redirect_uris/client_name
  // format validation above instead; a real distributed rate limit would
  // need shared infra (e.g. Upstash Redis) this app doesn't have yet.
  const admin = createAdminClient();
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
        { status: 201, headers: NO_STORE_HEADERS }
      );
    }

    if (error.code !== "23505") {
      return registrationError("server_error", 500, error.message);
    }
    // 23505 = unique violation on client_id; regenerate and retry.
  }

  return registrationError("server_error", 500, "클라이언트 등록에 실패했습니다. 다시 시도해주세요.");
}
