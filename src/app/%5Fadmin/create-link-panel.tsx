"use client";

import { SubmitButton } from "@/components/submit-button";
import { createLink } from "./actions";

const fieldClass =
  "h-11 w-full rounded-sm border border-border bg-white px-3.5 text-[15px] text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";
const labelClass = "mb-1.5 block text-[13px] font-semibold text-text-primary";

export function CreateLinkPanel({
  error,
  created,
}: {
  error?: string;
  created?: string;
}) {
  return (
    <form
      action={createLink}
      className="rounded-md border border-border bg-surface p-6 shadow-sm"
    >
      {error && (
        <div className="mb-4 rounded-sm bg-danger-subtle px-3.5 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}
      {created && (
        <div className="mb-4 rounded-sm bg-success-subtle px-3.5 py-3 text-[13px] text-success">
          /{created} 생성됐어요
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[220px] flex-1">
          <label className={labelClass}>대상 URL</label>
          <input
            name="targetUrl"
            type="text"
            required
            placeholder="https://example.com"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>alias</label>
          <input name="customAlias" required placeholder="my-link" className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>만료일(선택)</label>
          <input name="expiresAt" type="date" className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>비밀번호(선택)</label>
          <input name="password" type="password" className={fieldClass} />
        </div>
        <SubmitButton pendingLabel="생성 중...">생성</SubmitButton>
      </div>
    </form>
  );
}
