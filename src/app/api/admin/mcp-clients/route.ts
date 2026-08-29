import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateClientSecret, hashClientSecret } from "@/lib/oauth/client-secret";

const MAX_CLIENT_ID_ATTEMPTS = 5;

function generateClientId() {
  return `mcp_${randomBytes(16).toString("base64url")}`;
}

export async function GET() {
  const guard = await requireAdminApi();
  if (guard.error) return guard.error;

  // RLS on oauth_clients has zero policies (service-role only, see
  // 0006_mcp_oauth.sql) — the admin check above is the actual
  // authorization boundary for this route, not a policy.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("oauth_clients")
    .select("id, name, client_id, redirect_uris, created_at, revoked_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

type CreateClientBody = {
  name?: string;
  redirect_uris?: string[];
};

function isValidRedirectUri(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.error) return guard.error;

  let body: CreateClientBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every(isValidRedirectUri)) {
    return NextResponse.json(
      { error: "유효한 redirect URI를 하나 이상 입력해주세요." },
      { status: 400 }
    );
  }

  const clientSecret = generateClientSecret();
  const clientSecretHash = hashClientSecret(clientSecret);
  const admin = createAdminClient();

  for (let attempt = 0; attempt < MAX_CLIENT_ID_ATTEMPTS; attempt++) {
    const clientId = generateClientId();
    const { data, error } = await admin
      .from("oauth_clients")
      .insert({
        name,
        client_id: clientId,
        client_secret_hash: clientSecretHash,
        redirect_uris: redirectUris,
        created_by: guard.user.id,
      })
      .select("id, name, client_id, redirect_uris, created_at, revoked_at")
      .single();

    if (!error) {
      // client_secret is only ever returned here, in plaintext, once —
      // only the hash is persisted (see 0006_mcp_oauth.sql).
      return NextResponse.json({ ...data, client_secret: clientSecret }, { status: 201 });
    }

    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // 23505 = unique violation on client_id; regenerate and retry.
  }

  return NextResponse.json(
    { error: "클라이언트 등록에 실패했습니다. 다시 시도해주세요." },
    { status: 500 }
  );
}
