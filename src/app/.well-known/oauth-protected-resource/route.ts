import { NextResponse } from "next/server";
import { MCP_SCOPE, getIssuer } from "@/lib/oauth/jwt";

// RFC 9728 protected resource metadata for the MCP server at /api/mcp —
// points MCP clients at this app's own authorization server (there's only
// ever one, so authorization_servers has a single entry).
export async function GET(request: Request) {
  const issuer = getIssuer(request.url);

  return NextResponse.json({
    resource: `${issuer}/api/mcp`,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: [MCP_SCOPE],
  });
}
