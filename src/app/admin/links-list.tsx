"use client";

import { Fragment, useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { deleteLink, updateLink } from "./actions";

type LinkItem = {
  id: string;
  slug: string;
  target_url: string;
  expires_at: string | null;
  password_hash: string | null;
  created_at: string;
  clicks: { count: number }[] | null;
};

const fieldClass =
  "h-10 w-full rounded-sm border border-border bg-white px-3 text-[14px] text-text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";

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

export function LinksList({ links }: { links: LinkItem[] }) {
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
        <p className="text-[15px] text-text-secondary">첫 단축 링크를 만들어보세요</p>
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
        {filtered.map((link) => (
          <div key={link.id} className="rounded-md border border-border bg-surface p-4">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-text-primary">
                /{link.slug}
              </span>
              {statusBadge(link)}
            </div>
            <div className="mb-2 truncate text-[13px] text-text-secondary">
              {link.target_url}
            </div>
            <div className="mb-2.5 text-xs text-text-disabled">
              클릭 {link.clicks?.[0]?.count ?? 0} · 생성 {formatDate(link.created_at)} · 만료{" "}
              {link.expires_at ? formatDate(link.expires_at) : "없음"}
            </div>
            <div className="flex gap-1.5">
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
            {editingId === link.id && <EditForm link={link} />}
          </div>
        ))}
      </div>

      {/* desktop table */}
      <div className="hidden overflow-hidden rounded-md border border-border bg-surface lg:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-bg">
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                단축 URL
              </th>
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                원본 URL
              </th>
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                클릭수
              </th>
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                생성일
              </th>
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                만료일
              </th>
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                상태
              </th>
              <th className="border-b border-border px-3.5 py-3 text-left text-xs text-text-secondary">
                작업
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((link) => (
              <Fragment key={link.id}>
                <tr>
                  <td className="border-b border-border px-3.5 py-3 font-mono text-sm">
                    /{link.slug}
                  </td>
                  <td className="max-w-[280px] truncate border-b border-border px-3.5 py-3 text-sm">
                    {link.target_url}
                  </td>
                  <td className="border-b border-border px-3.5 py-3 text-sm">
                    {link.clicks?.[0]?.count ?? 0}
                  </td>
                  <td className="border-b border-border px-3.5 py-3 text-sm">
                    {formatDate(link.created_at)}
                  </td>
                  <td className="border-b border-border px-3.5 py-3 text-sm">
                    {link.expires_at ? formatDate(link.expires_at) : "없음"}
                  </td>
                  <td className="border-b border-border px-3.5 py-3 text-sm">
                    {statusBadge(link)}
                  </td>
                  <td className="border-b border-border px-3.5 py-3 text-sm">
                    <div className="flex gap-1.5">
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
                  </td>
                </tr>
                {editingId === link.id && (
                  <tr>
                    <td colSpan={7} className="border-b border-border bg-bg px-3.5 py-4">
                      <EditForm link={link} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal link={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
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
      className={`flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-sm ${
        danger ? "text-danger" : "text-text-secondary"
      }`}
    >
      {children}
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
        type="url"
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

function DeleteConfirmModal({ link, onClose }: { link: LinkItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111113]/40 p-4">
      <div className="w-full max-w-[360px] rounded-lg bg-white p-6 shadow-md">
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
            className="h-11 flex-1 rounded-sm border border-border-strong text-[15px] font-semibold text-text-primary hover:border-text-primary"
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
              className="h-11 w-full rounded-sm border border-danger text-[15px] font-semibold text-danger hover:bg-danger-subtle"
            >
              삭제
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
