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

const ADMIN_ROLES = new Set(["super_admin", "admin"]);

async function guardAdmin(request: NextRequest) {
  const { supabase, getResponse } = createProxyClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/_login", request.url));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // Fail closed: a query error, a missing profile row (e.g. an auth user
  // left behind by a partially-failed account-creation rollback, see
  // _admin/accounts/actions.ts), or a role outside the known set must never
  // fall through to "allowed" — only an explicit, recognized role does.
  if (profileError || !profile || !ADMIN_ROLES.has(profile.role)) {
    await supabase.auth.signOut();
    const redirectResponse = NextResponse.redirect(new URL("/_login", request.url));
    getResponse()
      .cookies.getAll()
      .forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
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
  // request.nextUrl.pathname is percent-encoded for non-ASCII segments
  // (e.g. Korean aliases), but links.slug stores the raw decoded text —
  // the same decoding Next.js applies automatically to /g/[slug] params.
  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    return NextResponse.next();
  }

  const supabase = createAdminClient();

  const { data: link } = await supabase
    .from("links")
    .select("id, target_url, expires_at, password_hash")
    .eq("slug", decodedSlug)
    .maybeSingle();

  if (!link) {
    return NextResponse.next();
  }

  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/expired", request.url));
  }

  if (link.password_hash) {
    return NextResponse.redirect(new URL(`/g/${decodedSlug}`, request.url));
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
