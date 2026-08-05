import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { generateRandomSlug, isValidCustomAlias } from "@/lib/slug";
import { hashPassword } from "@/lib/password";
import { normalizeTargetUrl } from "@/lib/url";

const MAX_SLUG_ATTEMPTS = 5;

type CreateLinkBody = {
  targetUrl?: string;
  customAlias?: string;
  expiresAt?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: CreateLinkBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const { customAlias, expiresAt, password } = body;

  const targetUrl = body.targetUrl ? normalizeTargetUrl(body.targetUrl) : null;
  if (!targetUrl) {
    return NextResponse.json(
      { error: "유효한 URL(http/https)을 입력해주세요." },
      { status: 400 }
    );
  }

  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
    return NextResponse.json({ error: "유효한 만료일이 아닙니다." }, { status: 400 });
  }

  const passwordHash = password ? hashPassword(password) : null;

  if (customAlias) {
    if (!isValidCustomAlias(customAlias)) {
      return NextResponse.json(
        { error: "alias는 영문/숫자/-/_ 조합 64자 이하여야 합니다." },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "커스텀 alias는 관리자 로그인 후 사용할 수 있습니다." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("links")
      .insert({
        slug: customAlias,
        target_url: targetUrl,
        expires_at: expiresAt ?? null,
        password_hash: passwordHash,
        created_by: user.id,
      })
      .select("slug")
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 400;
      const message =
        error.code === "23505" ? "이미 사용 중인 alias입니다." : error.message;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(toResponse(request, data.slug), { status: 201 });
  }

  const admin = createAdminClient();

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = generateRandomSlug();
    const { error } = await admin.from("links").insert({
      slug,
      target_url: targetUrl,
      expires_at: expiresAt ?? null,
      password_hash: passwordHash,
      created_by: null,
    });

    if (!error) {
      return NextResponse.json(toResponse(request, slug), { status: 201 });
    }

    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // 23505 = unique violation on slug; regenerate and retry.
  }

  return NextResponse.json(
    { error: "단축 URL 생성에 실패했습니다. 다시 시도해주세요." },
    { status: 500 }
  );
}

function toResponse(request: Request, slug: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  return { slug, shortUrl: `${origin.replace(/\/$/, "")}/${slug}` };
}
