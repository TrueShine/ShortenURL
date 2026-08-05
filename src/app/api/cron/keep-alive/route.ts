import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Supabase Free-tier projects auto-pause after 7 days with no activity.
 * Vercel Cron hits this daily with a real query to keep the project awake.
 */
export async function GET(request: Request) {
  // Fail closed when the secret is missing: comparing against
  // `Bearer ${undefined}` would otherwise let anyone through by sending the
  // literal header "Bearer undefined".
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("links")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count, checkedAt: new Date().toISOString() });
}
