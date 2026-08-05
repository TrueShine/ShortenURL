import { verifyGatePassword } from "./actions";

export default async function GatePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        비밀번호가 필요한 링크입니다
      </h1>
      <form
        action={verifyGatePassword}
        className="flex w-full max-w-xs flex-col gap-3"
      >
        <input type="hidden" name="slug" value={slug} />
        <input
          type="password"
          name="password"
          required
          placeholder="비밀번호"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded bg-black px-3 py-2 text-white dark:bg-zinc-50 dark:text-black"
        >
          이동하기
        </button>
        {error && (
          <p className="text-sm text-red-600">비밀번호가 올바르지 않습니다.</p>
        )}
      </form>
    </div>
  );
}
