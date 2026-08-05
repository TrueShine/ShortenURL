export default function ExpiredPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        만료된 링크입니다
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        이 단축 URL은 더 이상 사용할 수 없습니다.
      </p>
    </div>
  );
}
