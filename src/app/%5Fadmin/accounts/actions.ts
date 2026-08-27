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
    return {
      error: `계정은 생성됐지만 권한 정보 저장에 실패했습니다(${profileError.message}). 다시 시도하기 전에 Supabase 대시보드에서 이 계정을 확인해주세요.`,
    };
  }

  return { created: { email, password: tempPassword } };
}
