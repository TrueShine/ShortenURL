"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";
import { isValidCustomAlias } from "@/lib/slug";
import { normalizeTargetUrl } from "@/lib/url";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createLink(formData: FormData) {
  const { supabase, user } = await requireUser();

  const targetUrl = normalizeTargetUrl(String(formData.get("targetUrl") ?? ""));
  const customAlias = String(formData.get("customAlias") ?? "");
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!targetUrl) {
    redirect(`/admin?error=${encodeURIComponent("유효한 URL(http/https)을 입력해주세요.")}`);
  }

  if (!isValidCustomAlias(customAlias)) {
    redirect(
      `/admin?error=${encodeURIComponent("alias는 영문/숫자/-/_ 조합 64자 이하여야 합니다.")}`
    );
  }

  const { error } = await supabase.from("links").insert({
    slug: customAlias,
    target_url: targetUrl,
    expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null,
    password_hash: password ? hashPassword(password) : null,
    created_by: user.id,
  });

  if (error) {
    const message =
      error.code === "23505" ? "이미 사용 중인 alias입니다." : error.message;
    redirect(`/admin?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin");
  redirect(`/admin?created=${encodeURIComponent(customAlias)}`);
}

export async function updateLink(formData: FormData) {
  const { supabase } = await requireUser();

  const id = String(formData.get("id") ?? "");
  const targetUrl = normalizeTargetUrl(String(formData.get("targetUrl") ?? ""));
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");
  const clearPassword = formData.get("clearPassword") === "on";
  const password = String(formData.get("password") ?? "");

  if (!targetUrl) {
    redirect(`/admin?error=${encodeURIComponent("유효한 URL(http/https)을 입력해주세요.")}`);
  }

  const update: {
    target_url: string;
    expires_at: string | null;
    password_hash?: string | null;
  } = {
    target_url: targetUrl,
    expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null,
  };

  if (clearPassword) {
    update.password_hash = null;
  } else if (password) {
    update.password_hash = hashPassword(password);
  }

  const { error } = await supabase.from("links").update(update).eq("id", id);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  redirect("/admin?updated=1");
}

export async function deleteLink(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");

  await supabase.from("links").delete().eq("id", id);

  revalidatePath("/admin");
}
