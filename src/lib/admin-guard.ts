import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Mirrors proxy.ts's guardAdmin() role set — but that middleware skips
// everything under /api (see the `pathname.startsWith("/api")` early
// return in proxy.ts), so JSON API routes under /api/admin/* need their
// own copy of the same check instead of inheriting it for free.
const ADMIN_ROLES = new Set(["super_admin", "admin"]);

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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  // Fail closed, same reasoning as guardAdmin() in proxy.ts.
  if (profileError || !profile || !ADMIN_ROLES.has(profile.role)) {
    return { error: NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 }) };
  }

  if (profile.must_change_password) {
    return {
      error: NextResponse.json({ error: "비밀번호를 먼저 변경해주세요." }, { status: 403 }),
    };
  }

  return { supabase, user };
}
