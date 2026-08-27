"use client";

import { useMemo, useState } from "react";
import { CreateLinkPanel } from "./create-link-panel";
import { LinksList, type LinkItem } from "./links-list";

type Tab = "create" | "admin" | "other";

export function AdminTabs({
  error,
  links,
  creatorEmailById,
}: {
  error?: string;
  links: LinkItem[];
  creatorEmailById?: Record<string, string>;
}) {
  const [tab, setTab] = useState<Tab>(error ? "create" : "admin");

  const adminLinks = useMemo(() => links.filter((l) => l.created_by !== null), [links]);
  const otherLinks = useMemo(() => links.filter((l) => l.created_by === null), [links]);

  return (
    <div>
      <div role="tablist" className="mb-5 flex gap-1 border-b border-border">
        <TabButton active={tab === "create"} onClick={() => setTab("create")}>
          링크 생성
        </TabButton>
        <TabButton active={tab === "admin"} onClick={() => setTab("admin")}>
          관리자 링크 ({adminLinks.length})
        </TabButton>
        <TabButton active={tab === "other"} onClick={() => setTab("other")}>
          다른 링크 ({otherLinks.length})
        </TabButton>
      </div>

      {tab === "create" && <CreateLinkPanel error={error} />}
      {tab === "admin" && (
        <LinksList links={adminLinks} creatorEmailById={creatorEmailById} />
      )}
      {tab === "other" && <LinksList links={otherLinks} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[0.875rem] font-semibold transition-colors ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
