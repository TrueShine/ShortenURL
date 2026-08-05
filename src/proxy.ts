import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const config = {
  matcher: [
    "/((?!api|admin|login|logout|g|expired|favicon.ico|logo.png|robots.txt|sitemap.xml|_next).*)",
  ],
};

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);

  // Only single-segment paths (e.g. /abc123) are candidate short-link slugs.
  if (segments.length !== 1) {
    return NextResponse.next();
  }

  const slug = segments[0];
  const supabase = createAdminClient();

  const { data: link } = await supabase
    .from("links")
    .select("id, target_url, expires_at, password_hash")
    .eq("slug", slug)
    .maybeSingle();

  if (!link) {
    return NextResponse.next();
  }

  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/expired", request.url));
  }

  if (link.password_hash) {
    return NextResponse.redirect(new URL(`/g/${slug}`, request.url));
  }

  event.waitUntil(
    (async () => {
      await supabase
        .from("clicks")
        .insert({ link_id: link.id, referrer: request.headers.get("referer") });
    })()
  );

  return NextResponse.redirect(new URL(link.target_url, request.url));
}
