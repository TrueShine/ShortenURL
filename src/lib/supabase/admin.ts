import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client for server-only paths (route handlers, proxy) that must
 * bypass RLS — e.g. resolving a slug or recording a click for anonymous visitors.
 * Never import this from client components.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// auth.admin.listUsers() only returns one page (50 users by default) —
// walk every page so accounts past the first page don't show up as
// missing once there are more than a handful of admins.
export async function listAllUserEmails(admin: ReturnType<typeof createAdminClient>) {
  const perPage = 200;
  const emailById = new Map<string, string | undefined>();

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data) break;

    for (const user of data.users) {
      emailById.set(user.id, user.email);
    }

    if (data.users.length < perPage) break;
  }

  return emailById;
}
