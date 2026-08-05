import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProxyClient } from "@/lib/supabase/proxy";

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|logo.png|robots.txt|sitemap.xml).*)",
  ],
};

// Top-level path segments that are app routes, never short-link slugs.
// _admin/_login are underscore-prefixed so they don't collide with the
// custom-alias namespace admins can pick from (see lib/slug.ts).
const RESERVED_TOP_LEVEL = new Set([
  "api",
  "_admin",
  "_login",
  "g",
  "expired",
]);

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (first === "_admin") {
    return guardAdmin(request);
  }

  if (first === "_login") {
    return redirectIfAlreadyLoggedIn(request);
  }

  // Only single, non-reserved segments (e.g. /abc123) are candidate slugs.
  if (segments.length !== 1 || RESERVED_TOP_LEVEL.has(first)) {
    return NextResponse.next();
  }

  return resolveSlugRedirect(request, event, first);
}

async function guardAdmin(request: NextRequest) {
  const { supabase, getResponse } = createProxyClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/_login", request.url));
  }

  return getResponse();
}

async function redirectIfAlreadyLoggedIn(request: NextRequest) {
  const { supabase, getResponse } = createProxyClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return NextResponse.redirect(new URL("/_admin", request.url));
  }

  return getResponse();
}

async function resolveSlugRedirect(
  request: NextRequest,
  event: NextFetchEvent,
  slug: string
) {
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
