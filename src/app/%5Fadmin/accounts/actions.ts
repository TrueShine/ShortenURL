"use server";

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

  return { created: { email, password: tempPassword } };
}
