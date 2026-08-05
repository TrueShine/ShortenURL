import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/_login");
  }

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
