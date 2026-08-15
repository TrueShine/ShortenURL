"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";
import { isValidCustomAlias } from "@/lib/slug";
import { normalizeTargetUrl } from "@/lib/url";
import { presetToIsoDate, isExpiryPreset } from "@/lib/expiry";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/_login");
  }

  return { supabase, user };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/_login");
}

export type CreateLinkState = { createdSlug?: string } | null;

export async function createLink(
  _prevState: CreateLinkState,
  formData: FormData
): Promise<CreateLinkState> {
  const { supabase, user } = await requireUser();

  const targetUrl = normalizeTargetUrl(String(formData.get("targetUrl") ?? ""));
  const customAlias = String(formData.get("customAlias") ?? "");
  const expiryPresetRaw = String(formData.get("expiryPreset") ?? "none");
  const expiryCustomDate = String(formData.get("expiryCustomDate") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!targetUrl) {
    redirect(`/_admin?error=${encodeURIComponent("유효한 URL(http/https)을 입력해주세요.")}`);
  }

  if (!isValidCustomAlias(customAlias)) {
    redirect(
      `/_admin?error=${encodeURIComponent("alias는 영문/숫자/한글/-/_ 조합 64자 이하여야 합니다.")}`
    );
  }

  if (!isExpiryPreset(expiryPresetRaw)) {
    redirect(`/_admin?error=${encodeURIComponent("유효하지 않은 만료일 옵션입니다.")}`);
  }

  // Computed here (server, at submission-processing time) rather than trusting
  // a client-precomputed timestamp, so "1일/7일/30일" stay accurate even if the
  // form was left open for a while before submitting.
  let expiresAtIso: string | null = null;
  if (expiryPresetRaw === "custom") {
    const iso = presetToIsoDate(expiryPresetRaw, expiryCustomDate);
    if (!iso) {
      redirect(`/_admin?error=${encodeURIComponent("유효한 만료일을 입력해주세요.")}`);
    }
    expiresAtIso = iso;
  } else {
    expiresAtIso = presetToIsoDate(expiryPresetRaw, "") ?? null;
  }

  const { error } = await supabase.from("links").insert({
    slug: customAlias,
    target_url: targetUrl,
    expires_at: expiresAtIso,
    password_hash: password ? hashPassword(password) : null,
    created_by: user.id,
  });

  if (error) {
    const message =
      error.code === "23505" ? "이미 사용 중인 alias입니다." : error.message;
    redirect(`/_admin?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/_admin");
  return { createdSlug: customAlias };
}

export async function updateLink(formData: FormData) {
  const { supabase } = await requireUser();

  const id = String(formData.get("id") ?? "");
  const targetUrl = normalizeTargetUrl(String(formData.get("targetUrl") ?? ""));
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");
  const clearPassword = formData.get("clearPassword") === "on";
  const password = String(formData.get("password") ?? "");

  if (!targetUrl) {
    redirect(`/_admin?error=${encodeURIComponent("유효한 URL(http/https)을 입력해주세요.")}`);
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
    redirect(`/_admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/_admin");
  redirect("/_admin?updated=1");
}

export async function deleteLink(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");

  await supabase.from("links").delete().eq("id", id);

  revalidatePath("/_admin");
}
