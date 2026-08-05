import { createClient } from "@/lib/supabase/server";
import { createLink, deleteLink, updateLink } from "./actions";

const inputClass =
  "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
}) {
  const { error, created, updated } = await searchParams;
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("links")
    .select("id, slug, target_url, expires_at, password_hash, created_at, clicks(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          내 링크
        </h1>
        <form
          action={createLink}
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap"
        >
          <div className="flex flex-1 min-w-[200px] flex-col gap-1">
            <label className="text-xs text-zinc-500">대상 URL</label>
            <input
              name="targetUrl"
              type="url"
              required
              placeholder="https://example.com"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">alias</label>
            <input name="customAlias" required placeholder="my-link" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">만료일(선택)</label>
            <input name="expiresAt" type="date" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">비밀번호(선택)</label>
            <input name="password" type="password" className={inputClass} />
          </div>
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-white dark:bg-zinc-50 dark:text-black"
          >
            생성
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {created && (
          <p className="mt-2 text-sm text-green-600">/{created} 생성됨</p>
        )}
        {updated && <p className="mt-2 text-sm text-green-600">수정됨</p>}
      </section>

      <section className="flex flex-col gap-3">
        {links && links.length > 0 ? (
          links.map((link) => (
            <div
              key={link.id}
              className="flex flex-col gap-2 rounded border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-medium text-black dark:text-zinc-50">
                    /{link.slug}
                  </span>
                  <span className="text-sm text-zinc-500 break-all">
                    {link.target_url}
                  </span>
                  <span className="text-xs text-zinc-400">
                    클릭 {link.clicks?.[0]?.count ?? 0}회
                    {link.expires_at &&
                      ` · 만료 ${new Date(link.expires_at).toLocaleDateString()}`}
                    {link.password_hash && " · 비번보호"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <details>
                    <summary className="cursor-pointer text-sm underline">
                      수정
                    </summary>
                    <form
                      action={updateLink}
                      className="mt-2 flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <input type="hidden" name="id" value={link.id} />
                      <input
                        name="targetUrl"
                        type="url"
                        required
                        defaultValue={link.target_url}
                        className={inputClass}
                      />
                      <input
                        name="expiresAt"
                        type="date"
                        defaultValue={link.expires_at?.slice(0, 10) ?? ""}
                        className={inputClass}
                      />
                      <input
                        name="password"
                        type="password"
                        placeholder="새 비밀번호(선택)"
                        className={inputClass}
                      />
                      <label className="flex items-center gap-2 text-xs text-zinc-500">
                        <input type="checkbox" name="clearPassword" />
                        비밀번호 보호 해제
                      </label>
                      <button
                        type="submit"
                        className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-zinc-50 dark:text-black"
                      >
                        저장
                      </button>
                    </form>
                  </details>
                  <form action={deleteLink}>
                    <input type="hidden" name="id" value={link.id} />
                    <button type="submit" className="text-sm text-red-600 underline">
                      삭제
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">아직 만든 링크가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
