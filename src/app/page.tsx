import Script from "next/script";
import { Logo } from "@/components/logo";
import { ShortenForm } from "./shorten-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-bg px-4 py-14 sm:py-16">
      <div className="w-full max-w-[30rem]">
        <Logo />
      </div>
      <ShortenForm />
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5996415121817335"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    </div>
  );
}
