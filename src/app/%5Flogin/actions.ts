"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Guards against an open redirect via the `redirect` query/form param: only
// a same-origin path (starting with a single "/", not "//" or "/\\", which
// browsers can treat as protocol-relative) is honored. Anything else falls
// back to the default /_admin destination.
function safeRedirectPath(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return null;
  }
  return path;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectParam = formData.get("redirect");
  const redirectTarget =
    typeof redirectParam === "string" ? safeRedirectPath(redirectParam) : null;
  const redirectSuffix = redirectTarget
    ? `&redirect=${encodeURIComponent(redirectTarget)}`
    : "";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/_login?error=1${redirectSuffix}`);
  }

  redirect(redirectTarget ?? "/_admin");
}
