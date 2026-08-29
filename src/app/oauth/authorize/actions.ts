"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUTHORIZATION_CODE_TTL_MS, MCP_SCOPE } from "@/lib/oauth/jwt";

export async function decideAuthorization(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/_login");
  }

  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const codeChallengeMethod = String(formData.get("code_challenge_method") ?? "");
  const stateRaw = formData.get("state");
  const state = typeof stateRaw === "string" ? stateRaw : undefined;
  const decision = String(formData.get("decision") ?? "");

  if (!clientId || !redirectUri) {
    redirect("/_admin");
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("oauth_clients")
    .select("id, redirect_uris, revoked_at")
    .eq("client_id", clientId)
    .maybeSingle();

  // Re-validated here regardless of what the page rendered — a POST to a
  // Server Action can be issued directly, bypassing the page's own checks
  // (same reasoning as requireSuperAdmin() in _admin/accounts/actions.ts).
  if (!client || client.revoked_at || !client.redirect_uris.includes(redirectUri)) {
    // redirect_uri isn't trusted yet at this point — that's exactly what
    // just failed to confirm — so bounce to the dashboard instead of it.
    redirect("/_admin");
  }

  const target = new URL(redirectUri);
  if (state) target.searchParams.set("state", state);

  if (decision !== "allow") {
    target.searchParams.set("error", "access_denied");
    redirect(target.toString());
  }

  if (!codeChallenge || codeChallengeMethod !== "S256") {
    target.searchParams.set("error", "invalid_request");
    redirect(target.toString());
  }

  const code = randomBytes(32).toString("base64url");

  const { error } = await admin.from("oauth_authorization_codes").insert({
    code,
    client_id: client.id,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    scope: MCP_SCOPE,
    user_id: user.id,
    expires_at: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS).toISOString(),
  });

  if (error) {
    target.searchParams.set("error", "server_error");
    redirect(target.toString());
  }

  target.searchParams.set("code", code);
  redirect(target.toString());
}
