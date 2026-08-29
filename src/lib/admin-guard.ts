import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Mirrors proxy.ts's guardAdmin() role set — but that middleware skips
// everything under /api (see the `pathname.startsWith("/api")` early
// return in proxy.ts), so JSON API routes under /api/admin/* need their
// own copy of the same check instead of inheriting it for free.
const ADMIN_ROLES = new Set(["super_admin", "admin"]);

export type AdminRoleCheck =
  | { ok: true }
  | { ok: false; reason: "not_admin" | "must_change_password" };

// Shared by every entry point that needs the admin-role check but isn't
// under /_admin (so doesn't inherit it from guardAdmin() in proxy.ts) —
// the JSON API guard below, and oauth/authorize's page + Server Action.
export async function checkAdminRole(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string
): Promise<AdminRoleCheck> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", userId)
    .maybeSingle();

  // Fail closed, same reasoning as guardAdmin() in proxy.ts.
  if (error || !profile || !ADMIN_ROLES.has(profile.role)) {
    return { ok: false, reason: "not_admin" };
  }

  if (profile.must_change_password) {
    return { ok: false, reason: "must_change_password" };
  }

  return { ok: true };
}

type AdminGuardResult =
  | { error: NextResponse; supabase?: undefined; user?: undefined }
  | { error?: undefined; supabase: Awaited<ReturnType<typeof createServerClient>>; user: { id: string } };

export async function requireAdminApi(): Promise<AdminGuardResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }

  const check = await checkAdminRole(supabase, user.id);
  if (!check.ok) {
    return check.reason === "must_change_password"
      ? { error: NextResponse.json({ error: "비밀번호를 먼저 변경해주세요." }, { status: 403 }) }
      : { error: NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 }) };
  }

  return { supabase, user };
}
