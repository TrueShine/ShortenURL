import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

// Auth itself is already enforced by guardAdmin() in src/proxy.ts
// (middleware), which redirects unauthenticated requests to /_login before
// they ever reach this layout — so this isn't re-verifying login. The
// getUser()/profiles lookup below is a new, unavoidable read: the nav needs
// to know the caller's *role* to decide whether to show "계정 관리", and
// that isn't something guardAdmin needed to know.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <div className="flex flex-1 flex-col bg-bg px-4 py-8 sm:px-6">
      <div className="w-full">
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
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <Link
                href="/_admin/accounts"
                className="text-[0.9375rem] font-semibold text-text-secondary hover:text-text-primary"
              >
                계정 관리
              </Link>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="text-[0.9375rem] font-semibold text-accent hover:underline"
              >
                로그아웃
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
