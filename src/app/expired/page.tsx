import Link from "next/link";
import { Logo } from "@/components/logo";

export default function ExpiredPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-bg px-4 py-14 sm:py-16">
      <div className="w-full max-w-[22.5rem] text-center">
        <Logo />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-dim text-2xl text-text-secondary">
          ⏱
        </div>
        <h1 className="mb-1 text-2xl font-bold text-text-primary">
          이 링크는 만료되었어요
        </h1>
        <p className="mb-6 text-[0.9375rem] text-text-secondary">
          더 이상 사용할 수 없는 단축 URL이에요
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-sm bg-accent px-5 text-[0.9375rem] font-semibold text-white hover:bg-accent-hover"
        >
          새 링크 만들기
        </Link>
      </div>
    </div>
  );
}
