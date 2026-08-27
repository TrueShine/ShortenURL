"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_LENGTH = 8;

export type ChangePasswordState = { error?: string } | null;

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/_login");
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < MIN_LENGTH) {
    return { error: `비밀번호는 ${MIN_LENGTH}자 이상이어야 합니다.` };
  }

  if (password !== confirmPassword) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: updateError.message };
  }

  // profiles has no self-UPDATE RLS policy by design (see 0003 migration) —
  // an RLS policy can't restrict which *column* a self-update touches, and
  // "self clears must_change_password" would also let a row edit its own
  // role. Clear the flag via the service-role client instead, scoped to
  // this caller's own id (taken from their session, never from form input)
  // so there's no path to writing anyone else's profile row.
  const admin = createAdminClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  if (profileError) {
    return {
      error: `비밀번호는 변경됐지만 상태 갱신에 실패했습니다(${profileError.message}). 페이지를 새로고침해 다시 시도해주세요.`,
    };
  }

  redirect("/_admin");
}
