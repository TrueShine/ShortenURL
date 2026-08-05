import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center bg-bg px-4 py-14 sm:py-16">
      <div className="w-full max-w-[360px] text-center">
        <Logo />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-dim text-2xl text-text-secondary">
          ?
        </div>
        <h1 className="mb-1 text-2xl font-bold text-text-primary">
          링크를 찾을 수 없어요
        </h1>
        <p className="mb-6 text-[15px] text-text-secondary">
          주소를 다시 확인해주세요
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-sm bg-accent px-5 text-[15px] font-semibold text-white hover:bg-accent-hover"
        >
          홈으로 가기
        </Link>
      </div>
    </div>
  );
}
