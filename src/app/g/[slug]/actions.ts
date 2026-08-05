"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/password";

export async function verifyGatePassword(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = createAdminClient();
  const { data: link } = await supabase
    .from("links")
    .select("id, target_url, expires_at, password_hash")
    .eq("slug", slug)
    .maybeSingle();

  if (!link) {
    redirect("/");
  }

  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    redirect("/expired");
  }

  if (!link.password_hash || !verifyPassword(password, link.password_hash)) {
    redirect(`/g/${slug}?error=1`);
  }

  await supabase.from("clicks").insert({ link_id: link.id, referrer: null });

  redirect(link.target_url);
}
