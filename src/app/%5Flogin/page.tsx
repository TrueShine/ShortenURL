import Link from "next/link";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { signIn } from "./actions";

const fieldClass =
  "h-11 w-full rounded-sm border border-border bg-white px-3.5 text-[0.9375rem] text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";
const fieldErrClass =
  "h-11 w-full rounded-sm border border-danger bg-white px-3.5 text-[0.9375rem] text-text-primary focus:outline-none";
const labelClass = "mb-1.5 block text-[0.8125rem] font-semibold text-text-primary";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center bg-bg px-4 py-14 sm:py-16">
      <div className="w-full max-w-[22.5rem]">
        <Logo />
        <h1 className="mb-1 text-center text-2xl font-bold text-text-primary">
          관리자 로그인
        </h1>
        <p className="mb-6 text-center text-[0.9375rem] text-text-secondary">
          내 링크를 관리하려면 로그인하세요
        </p>

        <form action={signIn} className="rounded-md border border-border bg-surface p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-sm bg-danger-subtle px-3.5 py-3 text-[0.8125rem] text-danger">
              이메일 또는 비밀번호가 올바르지 않아요
            </div>
          )}
          <div className="mb-4">
            <label className={labelClass}>이메일</label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className={error ? fieldErrClass : fieldClass}
            />
          </div>
          <div className="mb-4">
            <label className={labelClass}>비밀번호</label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className={error ? fieldErrClass : fieldClass}
            />
          </div>
          <SubmitButton pendingLabel="로그인 중..." className="w-full">
            로그인
          </SubmitButton>
        </form>

        <div className="mt-6 text-center text-[0.8125rem] text-text-secondary">
          <Link href="/" className="font-semibold text-accent hover:underline">
            ← 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
