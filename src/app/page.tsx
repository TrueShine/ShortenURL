import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <Image src="/logo.png" alt="j1n.uk" width={64} height={64} priority />
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        j1n.uk URL Shortener
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        생성 UI는 Design-Bee 디자인 반영 후 추가됩니다. 현재는 프로젝트
        스캐폴딩과 API 구현 단계입니다.
      </p>
    </div>
  );
}
