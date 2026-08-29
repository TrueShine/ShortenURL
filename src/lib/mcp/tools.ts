import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRandomSlug, isValidCustomAlias } from "@/lib/slug";
import { hashPassword } from "@/lib/password";
import { normalizeTargetUrl } from "@/lib/url";

const MAX_SLUG_ATTEMPTS = 5;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type McpCallerIdentity = {
  userId: string;
  role: "admin" | "super_admin";
};

function toolError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

// PostgREST's .or() filter list splits on top-level commas and treats
// %, _, ( ) as structural/wildcard characters — escape them so a search
// term containing any of those is matched literally instead of altering
// the query. See https://postgrest.org/en/stable/references/api/tables_views.html#operators
function escapeFilterValue(value: string) {
  return value.replace(/[\\%_,()]/g, (char) => `\\${char}`);
}

// Mirrors the RLS visibility split in 0003/0004_link_policies_require_role.sql
// (super_admin sees every link, admin only their own) — tool handlers use
// the service-role client (no cookie session to run RLS against), so that
// split has to be re-applied here explicitly at every links query.

export function registerLinkTools(server: McpServer, identity: McpCallerIdentity, issuer: string) {
  server.registerTool(
    "create_short_link",
    {
      title: "단축 URL 생성",
      description: "새 단축 URL을 생성합니다.",
      inputSchema: {
        targetUrl: z.string().describe("단축할 원본 URL"),
        customAlias: z.string().optional().describe("직접 지정할 alias (영문/숫자/한글/-/_, 64자 이하)"),
        expiresAt: z.string().optional().describe("만료 시각 (ISO 8601)"),
        password: z.string().optional().describe("링크 접근 비밀번호"),
      },
    },
    async ({ targetUrl: rawTargetUrl, customAlias, expiresAt, password }) => {
      const targetUrl = normalizeTargetUrl(rawTargetUrl);
      if (!targetUrl) {
        return toolError("유효한 URL(http/https)을 입력해주세요.");
      }

      if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
        return toolError("유효한 만료일이 아닙니다.");
      }

      if (customAlias && !isValidCustomAlias(customAlias)) {
        return toolError("alias는 영문/숫자/한글/-/_ 조합 64자 이하여야 합니다.");
      }

      const passwordHash = password ? hashPassword(password) : null;
      const admin = createAdminClient();

      if (customAlias) {
        const { data, error } = await admin
          .from("links")
          .insert({
            slug: customAlias,
            target_url: targetUrl,
            expires_at: expiresAt ?? null,
            password_hash: passwordHash,
            created_by: identity.userId,
          })
          .select("slug")
          .single();

        if (error) {
          return toolError(
            error.code === "23505" ? "이미 사용 중인 alias입니다." : error.message
          );
        }

        return toolResult({ slug: data.slug, shortUrl: `${issuer}/${data.slug}` });
      }

      for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
        const slug = generateRandomSlug();
        const { error } = await admin.from("links").insert({
          slug,
          target_url: targetUrl,
          expires_at: expiresAt ?? null,
          password_hash: passwordHash,
          created_by: identity.userId,
        });

        if (!error) {
          return toolResult({ slug, shortUrl: `${issuer}/${slug}` });
        }

        if (error.code !== "23505") {
          return toolError(error.message);
        }
        // 23505 = unique violation on slug; regenerate and retry.
      }

      return toolError("단축 URL 생성에 실패했습니다. 다시 시도해주세요.");
    }
  );

  server.registerTool(
    "list_short_links",
    {
      title: "단축 URL 목록 조회",
      description: "생성한 단축 URL 목록을 조회합니다.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("페이지 크기 (기본 20)"),
        offset: z.number().int().min(0).optional().describe("페이지 오프셋 (기본 0)"),
        search: z.string().optional().describe("slug/원본 URL 검색어"),
      },
    },
    async ({ limit = 20, offset = 0, search }) => {
      const admin = createAdminClient();

      let query = admin
        .from("links")
        .select("id, slug, target_url, created_at, expires_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (identity.role !== "super_admin") {
        query = query.eq("created_by", identity.userId);
      }

      if (search) {
        const escaped = escapeFilterValue(search);
        query = query.or(`slug.ilike.%${escaped}%,target_url.ilike.%${escaped}%`);
      }

      const { data: links, error, count } = await query;
      if (error) {
        return toolError(error.message);
      }

      const linkIds = (links ?? []).map((link) => link.id);
      const clickCounts = new Map<string, number>();

      if (linkIds.length > 0) {
        const { data: clicks, error: clicksError } = await admin
          .from("clicks")
          .select("link_id")
          .in("link_id", linkIds);

        if (clicksError) {
          return toolError(clicksError.message);
        }

        for (const click of clicks ?? []) {
          clickCounts.set(click.link_id, (clickCounts.get(click.link_id) ?? 0) + 1);
        }
      }

      return toolResult({
        links: (links ?? []).map((link) => ({
          slug: link.slug,
          targetUrl: link.target_url,
          createdAt: link.created_at,
          expiresAt: link.expires_at,
          clickCount: clickCounts.get(link.id) ?? 0,
        })),
        total: count ?? 0,
      });
    }
  );

  server.registerTool(
    "get_link_stats",
    {
      title: "단축 URL 통계 조회",
      description: "특정 단축 URL의 클릭 통계를 조회합니다.",
      inputSchema: {
        slug: z.string().describe("조회할 단축 URL의 slug"),
      },
    },
    async ({ slug }) => {
      const admin = createAdminClient();

      let linkQuery = admin
        .from("links")
        .select("id, slug, target_url, created_at, expires_at")
        .eq("slug", slug);
      if (identity.role !== "super_admin") {
        linkQuery = linkQuery.eq("created_by", identity.userId);
      }

      const { data: link, error: linkError } = await linkQuery.maybeSingle();
      if (linkError) {
        return toolError(linkError.message);
      }
      if (!link) {
        return toolError("링크를 찾을 수 없습니다.");
      }

      const { data: clicks, error: clicksError } = await admin
        .from("clicks")
        .select("created_at")
        .eq("link_id", link.id)
        .order("created_at", { ascending: false });

      if (clicksError) {
        return toolError(clicksError.message);
      }

      const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;
      const totalClicks = clicks?.length ?? 0;
      const last7DaysClicks =
        clicks?.filter((click) => new Date(click.created_at).getTime() >= sevenDaysAgo).length ?? 0;
      const lastClickAt = clicks?.[0]?.created_at ?? null;

      return toolResult({
        slug: link.slug,
        targetUrl: link.target_url,
        createdAt: link.created_at,
        expiresAt: link.expires_at,
        totalClicks,
        last7DaysClicks,
        lastClickAt,
      });
    }
  );
}
