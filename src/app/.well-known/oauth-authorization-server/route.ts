import { NextResponse } from "next/server";
import { MCP_SCOPE, getIssuer } from "@/lib/oauth/jwt";

// RFC 8414 authorization server metadata.
export async function GET(request: Request) {
  const issuer = getIssuer(request.url);

  return NextResponse.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    scopes_supported: [MCP_SCOPE],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
    ],
  });
}
