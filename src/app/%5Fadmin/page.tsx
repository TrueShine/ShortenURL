import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "./admin-tabs";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("links")
    .select(
      "id, slug, target_url, expires_at, password_hash, created_at, created_by, clicks(count)"
    )
    .order("created_at", { ascending: false });

  return <AdminTabs error={error} links={links ?? []} />;
}
