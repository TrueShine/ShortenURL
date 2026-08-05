import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        관리자 로그인
      </h1>
      <form action={signIn} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="이메일"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
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
          로그인
        </button>
        {error && (
          <p className="text-sm text-red-600">
            이메일 또는 비밀번호가 올바르지 않습니다.
          </p>
        )}
      </form>
    </div>
  );
}
