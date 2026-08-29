"use client";

import { useMemo, useState } from "react";
import { CreateLinkPanel } from "./create-link-panel";
import { LinksList, type LinkItem } from "./links-list";
import { McpPanel } from "./mcp/mcp-clients";

type Tab = "create" | "admin" | "other" | "mcp" | "accounts";

export function AdminTabs({
  error,
  links,
  creatorEmailById,
  accountsPanel,
}: {
  error?: string;
  links: LinkItem[];
  creatorEmailById?: Record<string, string>;
  // Rendered server-side by the parent page and passed down as an already-
  // built element (only super_admin gets a non-null value) — AdminTabs can't
  // fetch accounts itself since that needs the service-role client, which
  // must never end up in client-bundled code.
  accountsPanel?: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(error ? "create" : "admin");

  const adminLinks = useMemo(() => links.filter((l) => l.created_by !== null), [links]);
  const otherLinks = useMemo(() => links.filter((l) => l.created_by === null), [links]);

  return (
    <div>
      <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        <TabButton active={tab === "create"} onClick={() => setTab("create")}>
          링크 생성
        </TabButton>
        <TabButton active={tab === "admin"} onClick={() => setTab("admin")}>
          관리자 링크 ({adminLinks.length})
        </TabButton>
        <TabButton active={tab === "other"} onClick={() => setTab("other")}>
          다른 링크 ({otherLinks.length})
        </TabButton>
        <TabButton active={tab === "mcp"} onClick={() => setTab("mcp")}>
          MCP 연동
        </TabButton>
        {accountsPanel && (
          <TabButton active={tab === "accounts"} onClick={() => setTab("accounts")}>
            계정 관리
          </TabButton>
        )}
      </div>

      {tab === "create" && <CreateLinkPanel error={error} />}
      {tab === "admin" && (
        <LinksList links={adminLinks} creatorEmailById={creatorEmailById} />
      )}
      {tab === "other" && <LinksList links={otherLinks} />}
      {tab === "mcp" && <McpPanel />}
      {tab === "accounts" && accountsPanel}
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
