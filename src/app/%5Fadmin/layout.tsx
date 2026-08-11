import Image from "next/image";
import Link from "next/link";
import { signOut } from "./actions";

// Auth is already enforced by guardAdmin() in src/proxy.ts (middleware), which
// redirects unauthenticated requests to /_login before they ever reach this
// layout. Re-checking auth.getUser() here would just be a second, redundant
// Supabase Auth round trip on every /_admin navigation.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-bg px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-[960px]">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-black.png"
                alt="j1n.uk"
                width={343}
                height={176}
                className="h-7 w-auto sm:h-8"
              />
            </Link>
            <span className="text-xl font-bold text-text-primary">내 링크</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-[15px] font-semibold text-accent hover:underline"
            >
              로그아웃
            </button>
          </form>
        </header>
        {children}
      </div>
    </div>
  );
}
