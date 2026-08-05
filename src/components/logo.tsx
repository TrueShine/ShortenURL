import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="mb-8 block text-center text-[15px] font-bold tracking-tight text-text-primary"
    >
      j1n<span className="text-accent">.</span>uk
    </Link>
  );
}
