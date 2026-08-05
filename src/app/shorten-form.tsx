"use client";

import { useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";

type CreateLinkResult = {
  slug: string;
  shortUrl: string;
};

const inputClass =
  "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export function ShortenForm() {
  const [targetUrl, setTargetUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<CreateLinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    setCopied(false);

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          password: passwordEnabled && password ? password : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "단축 URL 생성에 실패했습니다.");
        return;
      }

      setResult(data);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="url"
          required
          placeholder="https://example.com/very/long/url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          className={inputClass}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">만료일(선택)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={passwordEnabled}
            onChange={(e) => setPasswordEnabled(e.target.checked)}
          />
          비밀번호로 보호
        </label>
        {passwordEnabled && (
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
        >
          {submitting ? "생성 중..." : "단축 URL 만들기"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col items-center gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <a
            href={result.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-black underline dark:text-zinc-50"
          >
            {result.shortUrl}
          </a>
          <button onClick={handleCopy} className="text-sm underline">
            {copied ? "복사됨" : "링크 복사"}
          </button>
          <QRCodeSVG value={result.shortUrl} size={160} />
        </div>
      )}
    </div>
  );
}
