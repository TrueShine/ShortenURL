import Image from "next/image";
import { ShortenForm } from "./shorten-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 px-6 py-16 text-center dark:bg-black">
      <Image src="/logo.png" alt="j1n.uk" width={64} height={64} priority />
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        j1n.uk URL Shortener
      </h1>
      <ShortenForm />
    </div>
  );
}
