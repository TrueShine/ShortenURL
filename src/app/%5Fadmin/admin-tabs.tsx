"use client";

import { useState } from "react";
import { CreateLinkPanel } from "./create-link-panel";
import { LinksList, type LinkItem } from "./links-list";

type Tab = "create" | "all";

export function AdminTabs({
  error,
  created,
  links,
}: {
  error?: string;
  created?: string;
  links: LinkItem[];
}) {
  const [tab, setTab] = useState<Tab>(error || created ? "create" : "all");

  return (
    <div>
      <div role="tablist" className="mb-5 flex gap-1 border-b border-border">
        <TabButton active={tab === "create"} onClick={() => setTab("create")}>
          링크 생성
        </TabButton>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          전체 링크
        </TabButton>
      </div>

      {tab === "create" ? (
        <CreateLinkPanel error={error} created={created} />
      ) : (
        <LinksList links={links} />
      )}
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
      className={`-mb-px border-b-2 px-4 py-2.5 text-[14px] font-semibold transition-colors ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
