import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/mcp-clients/[id]">) {
  const guard = await requireAdminApi();
  if (guard.error) return guard.error;

  const { id } = await ctx.params;

  const admin = createAdminClient();
  // revoked_at IS NULL in the WHERE clause makes this idempotent under a
  // duplicated request: only the first revoke returns a row, a second
  // returns null and 404s instead of clobbering revoked_at with a later
  // timestamp.
  const { data, error } = await admin
    .from("oauth_clients")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "클라이언트를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
