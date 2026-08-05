import { Logo } from "@/components/logo";
import { ShortenForm } from "./shorten-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-bg px-4 py-14 sm:py-16">
      <div className="w-full max-w-[480px]">
        <Logo />
      </div>
      <ShortenForm />
    </div>
  );
}
