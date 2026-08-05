"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { normalizeTargetUrl } from "@/lib/url";

type CreateLinkResult = {
  slug: string;
  shortUrl: string;
  targetUrl: string;
  expiresAt: string | null;
  hasPassword: boolean;
};

type ExpiryPreset = "none" | "1d" | "7d" | "30d" | "custom";

function presetToIsoDate(preset: ExpiryPreset, customDate: string) {
  const now = Date.now();
  switch (preset) {
    case "1d":
      return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    case "custom":
      return customDate ? new Date(customDate).toISOString() : undefined;
    default:
      return undefined;
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const fieldClass =
  "h-11 w-full rounded-sm border border-border bg-white px-3.5 text-[15px] text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";
const fieldErrClass =
  "h-11 w-full rounded-sm border border-danger bg-white px-3.5 text-[15px] text-text-primary focus:outline-none";
const labelClass = "mb-1.5 block text-[13px] font-semibold text-text-primary";

export function ShortenForm() {
  const [targetUrl, setTargetUrl] = useState("");
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>("none");
  const [customDate, setCustomDate] = useState("");
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "invalid" | "server-error">(
    "idle"
  );
  const [result, setResult] = useState<CreateLinkResult | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTargetUrl = normalizeTargetUrl(targetUrl);
    if (!normalizedTargetUrl) {
      setStatus("invalid");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: normalizedTargetUrl,
          expiresAt: presetToIsoDate(expiryPreset, customDate),
          password: passwordEnabled && password ? password : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("server-error");
        return;
      }

      setResult({
        slug: data.slug,
        shortUrl: data.shortUrl,
        targetUrl: normalizedTargetUrl,
        expiresAt: presetToIsoDate(expiryPreset, customDate) ?? null,
        hasPassword: passwordEnabled && Boolean(password),
      });
      setStatus("idle");
    } catch {
      setStatus("server-error");
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadQr() {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${result?.slug ?? "qr"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function handleReset() {
    setResult(null);
    setTargetUrl("");
    setExpiryPreset("none");
    setCustomDate("");
    setPasswordEnabled(false);
    setPassword("");
    setStatus("idle");
  }

  if (result) {
    return (
      <div className="w-full max-w-[480px]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-subtle text-2xl text-success">
          ✓
        </div>
        <h1 className="mb-1 text-center text-2xl font-bold text-text-primary">
          생성 완료
        </h1>
        <p className="mb-6 text-center text-[15px] text-text-secondary">
          링크가 준비됐어요
        </p>

        <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3 rounded-sm bg-code-bg px-4 py-3.5 text-lg font-semibold text-code-text">
                <span className="truncate font-mono">
                  {result.shortUrl.replace(/^https?:\/\//, "")}
                </span>
                <button
                  onClick={handleCopy}
                  title="복사"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white ${
                    copied ? "bg-success" : "bg-white/10"
                  }`}
                >
                  {copied ? "✓" : "⧉"}
                </button>
              </div>

              {copied ? (
                <div className="mt-3 text-[13px] font-semibold text-success">
                  복사됨!
                </div>
              ) : (
                <div className="mt-3 truncate text-[13px] text-text-secondary">
                  원본: {result.targetUrl}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
                <span className="rounded-pill bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-accent">
                  활성
                </span>
                {result.hasPassword && (
                  <span className="rounded-pill bg-warning-subtle px-2.5 py-0.5 text-xs font-medium text-warning">
                    비밀번호 보호
                  </span>
                )}
                {result.expiresAt && <span>만료: {formatDate(result.expiresAt)}</span>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex h-11 items-center justify-center rounded-sm bg-accent px-5 text-[15px] font-semibold text-white hover:bg-accent-hover"
                >
                  복사하기
                </button>
                <button
                  onClick={handleDownloadQr}
                  className="inline-flex h-11 items-center justify-center rounded-sm border border-border-strong px-5 text-[15px] font-semibold text-text-primary hover:border-text-primary"
                >
                  QR 다운로드
                </button>
              </div>
            </div>

            <div className="flex w-full items-center justify-center rounded-md border border-border bg-white p-4 sm:w-[180px] sm:shrink-0">
              <QRCodeCanvas ref={qrRef} value={result.shortUrl} size={148} />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[13px]">
          <button
            onClick={handleReset}
            className="font-semibold text-accent hover:underline"
          >
            새 링크 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px]">
      <h1 className="mb-1 text-center text-2xl font-bold text-text-primary">
        링크를 짧게
      </h1>
      <p className="mb-6 text-center text-[15px] text-text-secondary">
        긴 URL을 심플한 단축 링크와 QR코드로 만들어드려요
      </p>

      <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
        {status === "server-error" && (
          <div className="mb-4 rounded-sm bg-danger-subtle px-3.5 py-3 text-[13px] text-danger">
            일시적인 오류가 발생했어요. 다시 시도해주세요
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={labelClass}>원본 URL</label>
            <input
              type="text"
              required
              placeholder="https://example.com/very/long/link"
              value={targetUrl}
              onChange={(e) => {
                setTargetUrl(e.target.value);
                if (status === "invalid") setStatus("idle");
              }}
              disabled={status === "loading"}
              className={status === "invalid" ? fieldErrClass : fieldClass}
            />
            {status === "invalid" && (
              <p className="mt-1.5 text-[13px] text-danger">
                올바른 URL 형식이 아니에요
              </p>
            )}
          </div>

          <details className="mb-4">
            <summary className="cursor-pointer text-[13px] font-semibold text-text-secondary">
              옵션 (만료일 · 비밀번호)
            </summary>
            <div className="mt-3.5 flex flex-col gap-1">
              <div className="mb-4">
                <label className={labelClass}>만료일</label>
                <select
                  value={expiryPreset}
                  onChange={(e) => setExpiryPreset(e.target.value as ExpiryPreset)}
                  disabled={status === "loading"}
                  className={fieldClass}
                >
                  <option value="none">없음</option>
                  <option value="1d">1일</option>
                  <option value="7d">7일</option>
                  <option value="30d">30일</option>
                  <option value="custom">직접 설정</option>
                </select>
                {expiryPreset === "custom" && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    disabled={status === "loading"}
                    className={`${fieldClass} mt-2`}
                  />
                )}
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="text-[14px] text-text-primary">비밀번호 보호</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={passwordEnabled}
                  onClick={() => setPasswordEnabled((v) => !v)}
                  disabled={status === "loading"}
                  className={`relative h-6 w-10 shrink-0 rounded-pill transition-colors ${
                    passwordEnabled ? "bg-accent" : "bg-border-strong"
                  }`}
                >
                  <span
                    className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${
                      passwordEnabled ? "left-[19px]" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>
              {passwordEnabled && (
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={status === "loading"}
                  className={fieldClass}
                />
              )}
            </div>
          </details>

          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-accent text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-dim disabled:text-text-disabled"
          >
            {status === "loading" && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {status === "loading" ? "생성 중..." : "단축하기"}
          </button>
        </form>
      </div>

      <div className="mt-6 text-center text-[13px] text-text-secondary">
        관리자이신가요?{" "}
        <Link href="/_login" className="font-semibold text-accent hover:underline">
          로그인
        </Link>
      </div>
    </div>
  );
}
