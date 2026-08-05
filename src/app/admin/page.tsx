import { createClient } from "@/lib/supabase/server";
import { CreateLinkPanel } from "./create-link-panel";
import { LinksList } from "./links-list";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
}) {
  const { error, created } = await searchParams;
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("links")
    .select("id, slug, target_url, expires_at, password_hash, created_at, clicks(count)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <CreateLinkPanel error={error} created={created} />
      <LinksList links={links ?? []} />
    </div>
  );
}
