"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { SubmitButton } from "@/components/submit-button";
import { useCopyFeedback } from "@/lib/use-copy-feedback";
import { deleteLink, updateLink } from "./actions";
import { BrandUrlCanvas, type BrandUrlCanvasHandle } from "./brand-url-image";

export type LinkItem = {
  id: string;
  slug: string;
  target_url: string;
  expires_at: string | null;
  password_hash: string | null;
  created_at: string;
  created_by: string | null;
  clicks: { count: number }[] | null;
};

const fieldClass =
  "h-10 w-full rounded-sm border border-border bg-white px-3 text-[0.875rem] text-text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function statusBadge(link: LinkItem) {
  const expired = link.expires_at && new Date(link.expires_at).getTime() < Date.now();
  if (expired) {
    return (
      <span className="rounded-pill bg-surface-dim px-2.5 py-0.5 text-xs font-medium text-text-secondary">
        만료됨
      </span>
    );
  }
  if (link.password_hash) {
    return (
      <span className="rounded-pill bg-warning-subtle px-2.5 py-0.5 text-xs font-medium text-warning">
        비번보호
      </span>
    );
  }
  return (
    <span className="rounded-pill bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-accent">
      활성
    </span>
  );
}

export function LinksList({
  links,
  creatorEmailById,
}: {
  links: LinkItem[];
  creatorEmailById?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qrTarget, setQrTarget] = useState<LinkItem | null>(null);
  const [brandTarget, setBrandTarget] = useState<LinkItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return links;
    return links.filter(
      (l) => l.slug.toLowerCase().includes(q) || l.target_url.toLowerCase().includes(q)
    );
  }, [links, query]);

  if (links.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-dim text-2xl text-text-secondary">
          🔗
        </div>
        <p className="mb-1.5 font-semibold text-text-primary">아직 만든 링크가 없어요</p>
        <p className="text-[0.9375rem] text-text-secondary">첫 단축 링크를 만들어보세요</p>
      </div>
    );
  }

  return (
    <div>
      <input
        placeholder="별칭 또는 원본 URL 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${fieldClass} mb-4`}
      />

      {/* mobile cards */}
      <div className="flex flex-col gap-2.5 lg:hidden">
        {filtered.map((link, idx) => {
          const shortUrl =
            typeof window !== "undefined" ? `${window.location.origin}/${link.slug}` : "";
          return (
            <div
              key={link.id}
              className={`rounded-md border border-border p-4 ${
                idx % 2 === 1 ? "bg-bg" : "bg-surface"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <a
                    href={`/${link.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-mono text-sm font-semibold text-text-primary underline-offset-2 hover:underline"
                  >
                    /{link.slug}
                  </a>
                  <CopyTextButton text={shortUrl} label="단축 URL 복사" />
                </div>
                {statusBadge(link)}
              </div>
              <div className="mb-2 flex items-center gap-1.5">
                <a
                  href={link.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-[0.8125rem] text-text-secondary underline-offset-2 hover:underline"
                >
                  {link.target_url}
                </a>
                <CopyTextButton text={link.target_url} label="원본 URL 복사" />
              </div>
              <div className="mb-2.5 flex flex-col gap-0.5 text-xs text-text-disabled">
                <span>
                  클릭 {link.clicks?.[0]?.count ?? 0}
                  {creatorEmailById && (
                    <> · 생성자 {link.created_by ? creatorEmailById[link.created_by] ?? "—" : "—"}</>
                  )}
                </span>
                <span>생성 {formatDate(link.created_at)}</span>
                <span>만료 {link.expires_at ? formatDate(link.expires_at) : "없음"}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-1.5">
                  <IconButton label="QR 보기" onClick={() => setQrTarget(link)}>
                    ▦
                  </IconButton>
                  <IconButton label="URL 이미지 보기" onClick={() => setBrandTarget(link)}>
                    🖼
                  </IconButton>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <IconButton
                    label="수정"
                    onClick={() => setEditingId(editingId === link.id ? null : link.id)}
                  >
                    ✎
                  </IconButton>
                  <IconButton label="삭제" danger onClick={() => setDeleteTarget(link)}>
                    🗑
                  </IconButton>
                </div>
              </div>
              {editingId === link.id && <EditForm link={link} />}
            </div>
          );
        })}
      </div>

      {/* desktop table */}
      <div className="hidden overflow-hidden rounded-md border border-border bg-surface lg:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-bg">
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                링크
              </th>
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                클릭수
              </th>
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                일자
              </th>
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                상태
              </th>
              {creatorEmailById && (
                <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                  생성자
                </th>
              )}
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                작업
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((link, idx) => {
              const shortUrl =
                typeof window !== "undefined" ? `${window.location.origin}/${link.slug}` : "";
              return (
                <Fragment key={link.id}>
                  <tr className={idx % 2 === 1 ? "bg-bg" : "bg-surface"}>
                    <td className="border-b border-border px-3.5 py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`/${link.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate font-mono text-sm underline-offset-2 hover:underline"
                          >
                            /{link.slug}
                          </a>
                          <CopyTextButton text={shortUrl} label="단축 URL 복사" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={link.target_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="max-w-[15rem] truncate text-[0.8125rem] text-text-secondary underline-offset-2 hover:underline"
                          >
                            {link.target_url}
                          </a>
                          <CopyTextButton text={link.target_url} label="원본 URL 복사" />
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-border px-3.5 py-3 text-sm">
                      {link.clicks?.[0]?.count ?? 0}
                    </td>
                    <td className="border-b border-border px-3.5 py-3 text-sm">
                      <div className="flex flex-col gap-0.5">
                        <span>생성 {formatDate(link.created_at)}</span>
                        <span className="text-xs text-text-secondary">
                          만료 {link.expires_at ? formatDate(link.expires_at) : "없음"}
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-border px-3.5 py-3 text-sm">
                      {statusBadge(link)}
                    </td>
                    {creatorEmailById && (
                      <td className="border-b border-border px-3.5 py-3 text-sm text-text-secondary">
                        {link.created_by ? creatorEmailById[link.created_by] ?? "—" : "—"}
                      </td>
                    )}
                    <td className="border-b border-border px-3.5 py-3 text-sm">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          <IconButton label="QR 보기" onClick={() => setQrTarget(link)}>
                            ▦
                          </IconButton>
                          <IconButton label="URL 이미지 보기" onClick={() => setBrandTarget(link)}>
                            🖼
                          </IconButton>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <IconButton
                            label="수정"
                            onClick={() => setEditingId(editingId === link.id ? null : link.id)}
                          >
                            ✎
                          </IconButton>
                          <IconButton label="삭제" danger onClick={() => setDeleteTarget(link)}>
                            🗑
                          </IconButton>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {editingId === link.id && (
                    <tr>
                      <td
                        colSpan={creatorEmailById ? 6 : 5}
                        className="border-b border-border bg-bg px-3.5 py-4"
                      >
                        <EditForm link={link} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal link={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
      {qrTarget && <QrModal link={qrTarget} onClose={() => setQrTarget(null)} />}
      {brandTarget && (
        <BrandUrlModal link={brandTarget} onClose={() => setBrandTarget(null)} />
      )}
    </div>
  );
}

function CopyTextButton({ text, label }: { text: string; label: string }) {
  const { copied, copy } = useCopyFeedback();

  return (
    <button
      type="button"
      title={label}
      onClick={() => copy(text)}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-border bg-white text-xs ${
        copied ? "text-success" : "text-text-secondary"
      }`}
    >
      <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

function IconButton({
  children,
  label,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-border bg-white px-2.5 text-xs font-medium ${
        danger ? "text-danger" : "text-text-secondary"
      }`}
    >
      <span aria-hidden="true">{children}</span>
      <span>{label}</span>
    </button>
  );
}

function EditForm({ link }: { link: LinkItem }) {
  return (
    <form
      action={updateLink}
      className="mt-3 flex flex-col gap-2.5 rounded-sm border border-border bg-surface p-3.5"
    >
      <input type="hidden" name="id" value={link.id} />
      <input
        name="targetUrl"
        type="text"
        required
        defaultValue={link.target_url}
        className={fieldClass}
      />
      <input
        name="expiresAt"
        type="date"
        defaultValue={link.expires_at?.slice(0, 10) ?? ""}
        className={fieldClass}
      />
      <input name="password" type="password" placeholder="새 비밀번호(선택)" className={fieldClass} />
      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input type="checkbox" name="clearPassword" />
        비밀번호 보호 해제
      </label>
      <SubmitButton pendingLabel="저장 중...">저장</SubmitButton>
    </form>
  );
}

function QrModal({ link, onClose }: { link: LinkItem; onClose: () => void }) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const shortUrl =
    typeof window !== "undefined" ? `${window.location.origin}/${link.slug}` : "";

  function handleDownloadQr() {
    const canvas = qrRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `${link.slug}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#111113]/40 px-4 pb-4 pt-[10vh]">
      <div className="w-full max-w-[22.5rem] rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-2 text-lg font-bold text-text-primary">QR 코드</h2>
        <p className="mb-4 text-sm text-text-secondary">
          <span className="font-mono">j1n.uk/{link.slug}</span>
        </p>
        <div className="flex items-center justify-center rounded-md border border-border bg-white p-4">
          {shortUrl && <QRCodeCanvas ref={qrRef} value={shortUrl} size={270} />}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-sm border border-border-strong text-[0.9375rem] font-semibold text-text-primary hover:border-text-primary"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleDownloadQr}
            className="h-11 flex-1 rounded-sm bg-accent text-[0.9375rem] font-semibold text-white hover:bg-accent-hover"
          >
            QR 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandUrlModal({ link, onClose }: { link: LinkItem; onClose: () => void }) {
  const brandRef = useRef<BrandUrlCanvasHandle>(null);
  const shortUrl =
    typeof window !== "undefined" ? `${window.location.origin}/${link.slug}` : "";

  async function handleDownload() {
    const dataUrl = await brandRef.current?.getDataURL();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.download = `${link.slug}-image.png`;
    a.href = dataUrl;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111113]/40 p-4">
      <div className="flex h-[92vh] w-[95vw] flex-col rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-2 text-lg font-bold text-text-primary">URL 이미지</h2>
        <p className="mb-4 text-sm text-text-secondary">
          <span className="font-mono">j1n.uk/{link.slug}</span>
        </p>
        <div className="min-h-0 flex-1 rounded-md border border-border bg-white p-4">
          {shortUrl && <BrandUrlCanvas ref={brandRef} url={shortUrl} fit />}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-sm border border-border-strong text-[0.9375rem] font-semibold text-text-primary hover:border-text-primary"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="h-11 flex-1 rounded-sm bg-accent text-[0.9375rem] font-semibold text-white hover:bg-accent-hover"
          >
            이미지 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ link, onClose }: { link: LinkItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111113]/40 p-4">
      <div className="w-full max-w-[22.5rem] rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-2 text-lg font-bold text-text-primary">
          정말 삭제하시겠어요?
        </h2>
        <p className="text-sm text-text-secondary">
          되돌릴 수 없어요. <span className="font-mono">j1n.uk/{link.slug}</span> 링크가
          영구 삭제됩니다.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-sm border border-border-strong text-[0.9375rem] font-semibold text-text-primary hover:border-text-primary"
          >
            취소
          </button>
          <form
            action={deleteLink}
            className="flex-1"
            onSubmit={() => {
              onClose();
            }}
          >
            <input type="hidden" name="id" value={link.id} />
            <button
              type="submit"
              className="h-11 w-full rounded-sm border border-danger text-[0.9375rem] font-semibold text-danger hover:bg-danger-subtle"
            >
              삭제
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
