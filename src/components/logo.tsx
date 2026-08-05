import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="mb-8 flex justify-center">
      <Image
        src="/logo-black.png"
        alt="j1n.uk"
        width={343}
        height={176}
        priority
        className="h-8 w-auto lg:h-10"
      />
    </Link>
  );
}
