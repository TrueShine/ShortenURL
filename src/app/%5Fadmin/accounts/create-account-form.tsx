"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { createAdminAccount, type CreateAccountState } from "./actions";

const initialState: CreateAccountState = {};

const fieldClass =
  "h-11 w-full rounded-sm border border-border bg-white px-3.5 text-[0.9375rem] text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";
const labelClass = "mb-1.5 block text-[0.8125rem] font-semibold text-text-primary";

export function CreateAccountForm() {
  const [state, formAction] = useActionState(createAdminAccount, initialState);

  return (
    <form
      action={formAction}
      className="rounded-md border border-border bg-surface p-6 shadow-sm"
    >
      <h2 className="mb-4 text-[0.9375rem] font-semibold text-text-primary">
        관리자 계정 발급
      </h2>

      {state.error && (
        <div className="mb-4 rounded-sm bg-danger-subtle px-3.5 py-3 text-[0.8125rem] text-danger">
          {state.error}
        </div>
      )}

      {state.created && (
        <div className="mb-4 flex flex-col gap-1.5 rounded-sm bg-success-subtle px-3.5 py-3 text-[0.8125rem] text-success">
          <span>
            {state.created.email} 계정이 생성됐어요. 아래 임시 비밀번호를
            직접 전달해주세요 — 다시 표시되지 않습니다.
          </span>
          <code className="w-fit rounded-sm bg-white px-2 py-1 font-mono text-[0.875rem] text-text-primary">
            {state.created.password}
          </code>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[13.75rem] flex-1">
          <label className={labelClass}>이메일</label>
          <input
            name="email"
            type="email"
            required
            placeholder="admin@example.com"
            className={fieldClass}
          />
        </div>
        <SubmitButton pendingLabel="생성 중...">계정 생성</SubmitButton>
      </div>
    </form>
  );
}
