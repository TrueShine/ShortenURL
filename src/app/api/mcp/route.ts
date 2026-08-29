import { NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { getIssuer, verifyAccessToken, MCP_SCOPE } from "@/lib/oauth/jwt";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerLinkTools, type McpCallerIdentity } from "@/lib/mcp/tools";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

type AuthResult =
  | { response: NextResponse }
  | { identity: McpCallerIdentity; authInfo: AuthInfo };

// Every MCP request (POST/GET/DELETE) needs the same Bearer JWT check, so
// this runs once per request before the transport is even created —
// unauthenticated traffic never reaches McpServer/registerLinkTools.
async function authenticate(request: Request, issuer: string): Promise<AuthResult> {
  const wwwAuthenticate = `Bearer resource_metadata="${issuer}/.well-known/oauth-protected-resource"`;
  const unauthorized = () =>
    NextResponse.json(
      { error: "invalid_token" },
      { status: 401, headers: { "WWW-Authenticate": wwwAuthenticate } }
    );

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { response: unauthorized() };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const claims = await verifyAccessToken(token, issuer);
  if (!claims || claims.scope !== MCP_SCOPE) {
    return { response: unauthorized() };
  }

  const admin = createAdminClient();

  // JWTs carry no live DB check by design (see verifyAccessToken), so a
  // revoked client's already-issued tokens would otherwise keep working
  // for up to their full 1h TTL after DELETE /api/admin/mcp-clients/:id.
  // Reject here so revocation actually takes effect immediately.
  const { data: client } = await admin
    .from("oauth_clients")
    .select("id")
    .eq("id", claims.clientId)
    .is("revoked_at", null)
    .maybeSingle();

  if (!client) {
    return { response: unauthorized() };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", claims.userId)
    .maybeSingle();

  // Same fail-closed posture as guardAdmin()/requireAdminApi(): a token
  // can outlive an account being demoted, deleted, or forced through the
  // change-password flow, since access tokens carry no live DB check by
  // design (see verifyAccessToken in lib/oauth/jwt.ts).
  if (!profile || !ADMIN_ROLES.has(profile.role) || profile.must_change_password) {
    return {
      response: NextResponse.json({ error: "insufficient_scope" }, { status: 403 }),
    };
  }

  const identity: McpCallerIdentity = {
    userId: claims.userId,
    role: profile.role as "admin" | "super_admin",
  };

  return {
    identity,
    authInfo: {
      token,
      clientId: claims.clientId,
      scopes: [claims.scope],
      extra: { userId: claims.userId, role: profile.role },
    },
  };
}

function createServer(identity: McpCallerIdentity, issuer: string) {
  const server = new McpServer({ name: "shorten-url-mcp", version: "1.0.0" });
  registerLinkTools(server, identity, issuer);
  return server;
}

// Stateless: a fresh transport + server per request. No session store
// backs Mcp-Session-Id here — this app runs on Vercel (serverless, no
// shared in-memory state across invocations), so a real stateful session
// would need external storage this app doesn't have. Every client-sent
// Mcp-Session-Id is simply ignored, matching WebStandardStreamableHTTPServerTransport's
// documented stateless mode (sessionIdGenerator left unset).
async function handle(request: Request) {
  const issuer = getIssuer(request.url);
  const auth = await authenticate(request, issuer);
  if ("response" in auth) return auth.response;

  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createServer(auth.identity, issuer);
  await server.connect(transport);

  return transport.handleRequest(request, { authInfo: auth.authInfo });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}
