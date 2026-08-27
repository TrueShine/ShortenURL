import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTabs } from "./admin-tabs";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isSuperAdmin = profile?.role === "super_admin";

  const { data: links } = await supabase
    .from("links")
    .select(
      "id, slug, target_url, expires_at, password_hash, created_at, created_by, clicks(count)"
    )
    .order("created_at", { ascending: false });

  // Only super admins see a mixed list of every admin's links, so only they
  // need the creator's email resolved — a regular admin's list is already
  // scoped to their own links by RLS, making "created by" redundant.
  let creatorEmailById: Record<string, string> | undefined;
  if (isSuperAdmin && links) {
    const creatorIds = Array.from(
      new Set(links.map((l) => l.created_by).filter((id): id is string => id !== null))
    );
    if (creatorIds.length > 0) {
      const admin = createAdminClient();
      const results = await Promise.all(
        creatorIds.map((id) => admin.auth.admin.getUserById(id))
      );
      creatorEmailById = Object.fromEntries(
        results
          .map((r, i) => [creatorIds[i], r.data.user?.email] as const)
          .filter((entry): entry is [string, string] => Boolean(entry[1]))
      );
    }
  }

  return <AdminTabs error={error} links={links ?? []} creatorEmailById={creatorEmailById} />;
}
