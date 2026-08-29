"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { customAlphabet } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "../actions";

// Same unambiguous alphabet as lib/slug.ts, plus a couple of symbols so the
// generated string satisfies typical password-strength expectations even
// though it's only ever used once before the forced change flow (PR3).
const TEMP_PASSWORD_ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz!@#$%";
const generateTempPassword = customAlphabet(TEMP_PASSWORD_ALPHABET, 16);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreateAccountState = {
  error?: string;
  created?: { email: string; password: string };
};

export async function createAdminAccount(
  _prevState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  // The actual authorization gate — redirects away if the caller isn't
  // super_admin, regardless of whether the nav link that would submit this
  // form was ever shown to them.
  await requireSuperAdmin();

  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "유효한 이메일을 입력해주세요." };
  }

  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (error || !data.user) {
    const message =
      error?.code === "email_exists"
        ? "이미 사용 중인 이메일입니다."
        : (error?.message ?? "계정 생성에 실패했습니다.");
    return { error: message };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    role: "admin",
    must_change_password: true,
  });

  if (profileError) {
    // Auth user creation and the profiles insert aren't one atomic
    // transaction (different services), so a failure here would otherwise
    // leave a half-created account: an Auth user with no role, which also
    // blocks retrying with the same email. Compensate by deleting the Auth
    // user we just created instead of leaving that dangling state.
    const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);

    if (cleanupError) {
      return {
        error: `계정 생성 중 오류가 발생했고 되돌리기도 실패했습니다. Supabase 대시보드 > Authentication > Users에서 ${email} 계정을 직접 확인/삭제해주세요. (원인: ${profileError.message} / 롤백 실패: ${cleanupError.message})`,
      };
    }

    return {
      error: `계정 생성 중 오류가 발생해 되돌렸습니다. 다시 시도해주세요. (${profileError.message})`,
    };
  }

  // 실제 계정관리 화면은 이제 /_admin 탭 안에 있으므로 그 경로도 재검증한다.
  // /_admin/accounts는 그 라우트를 직접 방문했을 때를 위해 그대로 유지.
  revalidatePath("/_admin");
  revalidatePath("/_admin/accounts");
  return { created: { email, password: tempPassword } };
}

export type ResetPasswordState = {
  error?: string;
  created?: { password: string };
};

export async function resetAdminPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  // Re-verified here regardless of which UI path submitted the form — see
  // the comment on createAdminAccount above.
  await requireSuperAdmin();

  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) {
    return { error: "잘못된 요청입니다." };
  }

  const admin = createAdminClient();

  // Only ever act on ids that are actually a managed admin account — a
  // super_admin submitting this form directly could otherwise point it at
  // any auth.users id, admin account or not.
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id, must_change_password")
    .eq("id", accountId)
    .maybeSingle();

  if (!targetProfile) {
    return { error: "관리자 계정 목록에 없는 대상입니다." };
  }

  const previousMustChangePassword = targetProfile.must_change_password;

  // Flip the flag before touching the real password: if this update fails,
  // nothing about the account's actual credentials changed yet, so there's
  // nothing to roll back and no orphaned temp password to lose.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", accountId);

  if (profileError) {
    return { error: profileError.message };
  }

  const tempPassword = generateTempPassword();
  const { error: authError } = await admin.auth.admin.updateUserById(accountId, {
    password: tempPassword,
  });

  if (authError) {
    // The password change didn't actually happen, so the forced-change flag
    // we just set would be a lie — put it back the way it was.
    const { error: rollbackError } = await admin
      .from("profiles")
      .update({ must_change_password: previousMustChangePassword })
      .eq("id", accountId);

    if (rollbackError) {
      return {
        error: `비밀번호 변경에 실패했고 상태 되돌리기도 실패했습니다. Supabase 대시보드에서 해당 계정의 must_change_password 값을 직접 확인해주세요. (원인: ${authError.message} / 롤백 실패: ${rollbackError.message})`,
      };
    }

    return { error: authError.message };
  }

  revalidatePath("/_admin");
  revalidatePath("/_admin/accounts");
  return { created: { password: tempPassword } };
}

export async function deleteAdminAccount(formData: FormData) {
  // The actual authorization + self-delete gate — disabling the delete
  // button for your own row in the UI is just UX, not security, since this
  // Server Action can still be POSTed to directly.
  const { user } = await requireSuperAdmin();

  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) {
    redirect(`/_admin/accounts?error=${encodeURIComponent("잘못된 요청입니다.")}`);
  }

  const admin = createAdminClient();

  // Only ever act on ids that are actually a managed admin account — see the
  // matching comment in resetAdminPassword above.
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", accountId)
    .maybeSingle();

  if (!targetProfile) {
    redirect(`/_admin/accounts?error=${encodeURIComponent("관리자 계정 목록에 없는 대상입니다.")}`);
  }

  if (accountId === user.id) {
    redirect(
      `/_admin/accounts?error=${encodeURIComponent("본인(슈퍼관리자) 계정은 삭제할 수 없습니다.")}`
    );
  }

  // profiles row cascades away via its FK to auth.users (see
  // 0003_role_based_access.sql), and links.created_by is set to null via its
  // own FK (see 0001_init.sql) — existing links made by this account stay,
  // just without an owner, exactly like pre-existing anonymous links.
  const { error } = await admin.auth.admin.deleteUser(accountId);

  if (error) {
    redirect(`/_admin/accounts?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/_admin");
  revalidatePath("/_admin/accounts");
}
