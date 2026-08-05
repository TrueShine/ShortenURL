import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { verifyGatePassword } from "./actions";

const fieldClass =
  "h-11 w-full rounded-sm border border-border bg-white px-3.5 text-[15px] text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";
const fieldErrClass =
  "h-11 w-full rounded-sm border border-danger bg-white px-3.5 text-[15px] text-text-primary focus:outline-none";
const labelClass = "mb-1.5 block text-[13px] font-semibold text-text-primary";

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
    <div className="flex flex-1 flex-col items-center bg-bg px-4 py-14 sm:py-16">
      <div className="w-full max-w-[360px]">
        <Logo />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-subtle text-2xl text-accent">
          🔒
        </div>
        <h1 className="mb-1 text-center text-2xl font-bold text-text-primary">
          비밀번호로 보호된 링크예요
        </h1>
        <p className="mb-6 text-center text-[13px] text-text-secondary">
          <span className="font-mono">j1n.uk/{slug}</span>
        </p>

        <form
          action={verifyGatePassword}
          className="rounded-md border border-border bg-surface p-6 shadow-sm"
        >
          <input type="hidden" name="slug" value={slug} />
          <div className="mb-4">
            <label className={labelClass}>비밀번호</label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className={error ? fieldErrClass : fieldClass}
            />
            {error && (
              <p className="mt-1.5 text-[13px] text-danger">
                비밀번호가 올바르지 않아요
              </p>
            )}
          </div>
          <SubmitButton pendingLabel="확인 중..." className="w-full">
            이동하기
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
